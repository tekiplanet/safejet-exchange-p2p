import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';
import '../services/service_locator.dart';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import '../models/coin.dart';
import 'package:shared_preferences/shared_preferences.dart';

class WalletService {
  late final Dio _dio;
  final storage = const FlutterSecureStorage();
  final AuthService _authService = getIt<AuthService>();
  final _cache = <String, CacheEntry>{};
  final _cacheDuration = const Duration(minutes: 5);

  WalletService() {
    final baseUrl = _authService.baseUrl.replaceAll('/auth', '');
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
    ));
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: 'accessToken');
          print('Request URL: ${options.baseUrl}${options.path}');
          print('Request Headers: ${options.headers}');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          print('Error Response: ${error.response?.data}');
          print('Error Status Code: ${error.response?.statusCode}');
          print('Error Headers: ${error.response?.headers}');
          
          if (error.type == DioExceptionType.connectionError ||
              error.type == DioExceptionType.unknown) {
            RequestOptions requestOptions = error.requestOptions;
            
            try {
              print('Retrying request to: ${requestOptions.path}');
              final response = await _dio.request(
                requestOptions.path,
                data: requestOptions.data,
                queryParameters: requestOptions.queryParameters,
                options: Options(
                  method: requestOptions.method,
                  headers: requestOptions.headers,
                ),
              );
              return handler.resolve(response);
            } catch (e) {
              return handler.next(error);
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<Map<String, dynamic>> getBalances({
    String? type,
    String? currency,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        '/wallets/balances',
        queryParameters: {
          if (type != null) 'type': type,
          'page': page,
          'limit': limit,
        },
      );

      print('\n=== Raw Response Data ===');
      print(response.data);
      
      final balances = response.data['balances'] as List<dynamic>;
      balances.forEach((balance) {
        final token = balance['token'] as Map<String, dynamic>?;
        if (token == null) {
          print('Warning: Token data missing for balance: $balance');
          return;
        }
        
        final networks = balance['networks'] as List<dynamic>?;
        
        print('\n=== Token Balance ===');
        print('Symbol: ${token['symbol']}');
        print('Type: ${balance['type']}');
        
        // Process networks with new structure
        if (networks != null) {
          print('\nNetwork Breakdown:');
          networks.forEach((network) {
            if (network is Map<String, dynamic>) {
              print('  ${network['blockchain']} (${network['networkVersion']}): '
                  '${_formatBalance(network['balance'].toString(), token['decimals'] ?? 18)}');
            }
          });
        }
      });

      return response.data;
    } catch (e) {
      print('Error in getBalances: $e');
      rethrow;
    }
  }

  String _formatBalance(String balance, int decimals) {
    try {
      // print('\nFormatting balance:');
      // print('Input balance: $balance');
      // print('Decimals: $decimals');
      
      double rawValue = double.parse(balance);
      // print('Parsed raw value: $rawValue');
      
      BigInt baseUnits = BigInt.from(rawValue * math.pow(10, decimals));
      // print('Base units: $baseUnits');
      
      BigInt wholePart = baseUnits ~/ BigInt.from(math.pow(10, decimals));
      BigInt fractionalPart = baseUnits % BigInt.from(math.pow(10, decimals));
      
      String fractionalStr = fractionalPart.toString().padLeft(decimals, '0');
      
      // Trim trailing zeros while keeping at least one decimal place
      while (fractionalStr.endsWith('0') && fractionalStr.length > 1) {
        fractionalStr = fractionalStr.substring(0, fractionalStr.length - 1);
      }
      
      String result = '$wholePart.$fractionalStr';
      print('Formatted result: $result');
      return result;
    } catch (e) {
      print('Error formatting balance: $balance with decimals: $decimals');
      print('Error details: $e');
      return '0.0';
    }
  }

  Future<Map<String, dynamic>> updateTokenMarketData(String tokenId, {String? timeframe}) async {
    try {
      final response = await _dio.post(
        '/wallets/token/$tokenId/market-data',
        queryParameters: timeframe != null ? {'timeframe': timeframe} : null,
      );
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': response.data,
        };
      }
      
      return {
        'success': false,
        'message': 'Failed to update token market data',
      };
    } catch (e) {
      return {
        'success': false,
        'message': e.toString(),
      };
    }
  }

  Future<Map<String, dynamic>> getDepositAddress(
    String tokenId, {
    required String network,
    required String blockchain,
    required String version,
  }) async {
    try {
      final response = await _dio.get(
        '/wallets/deposit-address/$tokenId',
        queryParameters: {
          'network': network,
          'blockchain': blockchain,
          'version': version,
        },
      );
      return response.data;
    } catch (e) {
      debugPrint('Error getting deposit address: $e');
      rethrow;
    }
  }

  Future<List<Coin>> getAvailableCoins() async {
    try {
      final response = await _dio.get('/wallets/tokens/available');
      
      final List<dynamic> tokens = response.data['tokens'];
      return tokens.map((token) {
        final metadata = token['metadata'] as Map<String, dynamic>;
        final networks = List<Map<String, dynamic>>.from(token['networks']);
        
        // Deduplicate networks based on blockchain, version and network
        final uniqueNetworks = networks.fold<List<Map<String, dynamic>>>(
          [], 
          (unique, network) {
            if (!unique.any((n) => 
                n['blockchain'] == network['blockchain'] && 
                n['version'] == network['version'] &&
                n['network'] == network['network'])) {
              unique.add(network);
            }
            return unique;
          }
        );

        return Coin(
          id: token['id'],
          symbol: token['symbol'],
          name: token['name'],
          iconUrl: metadata['icon'],
          networks: uniqueNetworks.map((network) => Network(
            name: network['blockchain'],
            blockchain: network['blockchain'],
            version: network['version'],
            arrivalTime: network['arrivalTime'],
            network: network['network'],
            requiresMemo: network['requiredFields']?['memo'] ?? false,
            requiresTag: network['requiredFields']?['tag'] ?? false,
          )).toList(),
        );
      }).toList();
    } catch (e) {
      debugPrint('Error getting available coins: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> calculateWithdrawalFee({
    required String tokenId,
    required double amount,
    required String networkVersion,
    required String network,
  }) async {
    try {
      final response = await _dio.post(
        '/wallets/calculate-withdrawal-fee',
        data: {
          'tokenId': tokenId,
          'amount': amount,
          'networkVersion': networkVersion,
          'network': network,
        },
        options: Options(headers: await _getAuthHeaders()),
      );

      return response.data;
    } catch (e) {
      if (e is DioException) {
        final message = e.response?.data['message'];
        switch (e.response?.statusCode) {
          case 400:
            throw message ?? 'Invalid withdrawal request';
          case 404:
            throw 'Token or network configuration not found';
          default:
            throw 'Failed to calculate withdrawal fee';
        }
      }
      throw 'An error occurred while calculating fee';
    }
  }

  Future<Map<String, dynamic>> createWithdrawal({
    required String tokenId,
    required String amount,
    required String address,
    required String networkVersion,
    required String network,
    String? memo,
    String? tag,
    String? password,
    String? twoFactorCode,
  }) async {
    try {
      // Add only debug logs
      print('Withdrawal request network config:');
      print('  Network: $network');
      print('  Version: $networkVersion');
      print('  Token ID: $tokenId');

      final response = await _dio.post(
        '/wallets/withdraw',
        data: {
          'tokenId': tokenId,
          'amount': double.parse(amount),
          'address': address,
          'networkVersion': networkVersion,
          'network': network,
          'memo': memo,
          'tag': tag,
          if (password != null) 'password': password,
          if (twoFactorCode != null) 'twoFactorCode': twoFactorCode,
        },
      );
      return response.data;
    } catch (e) {
      print('Error creating withdrawal: $e');
      rethrow;
    }
  }

  Future<Map<String, String>> _getAuthHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  Future<void> createAddressBookEntry({
    required String name,
    required String address,
    required String blockchain,
    required String network,
    String? memo,
    String? tag,
  }) async {
    final token = await storage.read(key: 'token');
    
    await _dio.post(
      '/wallets/address-book',
      data: {
        'name': name,
        'address': address,
        'blockchain': blockchain,
        'network': network,
        'memo': memo,
        'tag': tag,
      },
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
        },
      ),
    );
  }

  Future<bool> checkAddressExists(String address, String blockchain, String network) async {
    final token = await storage.read(key: 'accessToken');
    
    try {
      final response = await _dio.post(
        '/wallets/address-book/check',
        data: {
          'address': address,
          'blockchain': blockchain,
          'network': network,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );
      
      if (response.data is bool) {
        return response.data as bool;
      } else if (response.data is Map) {
        return response.data['exists'] as bool;
      }
      return false;
    } catch (e) {
      print('Error checking address: $e');
      return false;
    }
  }

  Future<List<dynamic>> getAddressBook() async {
    final token = await storage.read(key: 'accessToken');
    
    try {
      final response = await _dio.get(
        '/wallets/address-book',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );
      return response.data;  // Assuming the response contains the list of addresses
    } catch (e) {
      print('Error fetching address book: $e');
      throw e;  // Rethrow the error for handling in the UI
    }
  }

  String _handleError(dynamic error) {
    if (error is DioException) {
      // Handle Dio specific errors
      if (error.response != null) {
        return error.response?.data['message'] ?? 'An error occurred';
      } else {
        return 'Network error: ${error.message}';
      }
    }
    return 'An unexpected error occurred';
  }

  Future<Map<String, dynamic>> getWalletBalances(String tokenId) async {
    try {
      // Use the existing getBalances method
      final response = await getBalances();
      final balances = response['balances'] as List<dynamic>;
      
      // Filter and transform balances for the specific token
      double spotBalance = 0.0;
      double fundingBalance = 0.0;

      for (var balance in balances) {
        if (balance['token']['id'] == tokenId) {
          if (balance['type'] == 'spot') {
            spotBalance = double.tryParse(balance['balance'].toString()) ?? 0.0;
          } else if (balance['type'] == 'funding') {
            fundingBalance = double.tryParse(balance['balance'].toString()) ?? 0.0;
          }
        }
      }

      return {
        'spot': spotBalance.toString(),
        'funding': fundingBalance.toString(),
      };
    } catch (e) {
      print('Error getting wallet balances: $e');
      throw 'Failed to load balances';
    }
  }

  Future<void> transferBalance({
    required String tokenId,
    required double amount,
    required String fromType,
    required String toType,
  }) async {
    try {
      await _dio.post(
        '/wallets/transfer',
        data: {
          'tokenId': tokenId,
          'amount': amount,
          'fromType': fromType,
          'toType': toType,
        },
      );
    } catch (e) {
      rethrow;
    }
  }
}

class CacheEntry {
  final Map<String, dynamic> data;
  final DateTime timestamp;
  final Duration validity;

  CacheEntry({
    required this.data,
    required this.timestamp,
    this.validity = const Duration(minutes: 1),
  });

  bool get isExpired => DateTime.now().difference(timestamp) > validity;
} 