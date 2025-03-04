import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';
import 'api_client.dart';

class P2PService {
  late final Dio _dio;
  final AuthService _authService = GetIt.I<AuthService>();
  final storage = const FlutterSecureStorage();

  P2PService() {
    final baseUrl = _authService.baseUrl.replaceAll('/auth', '');
    print('P2P Service initialized with base URL: $baseUrl');
    print('AuthService instance: $_authService');
    
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
          print('Making request to: ${options.baseUrl}${options.path}');
          print('Headers: ${options.headers}');
          
          final token = await storage.read(key: 'accessToken');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
            print('Token added to request: $token');
          } else {
            print('No token found!');
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          print('Full error details:');
          print('Base URL: ${error.requestOptions.baseUrl}');
          print('Path: ${error.requestOptions.path}');
          print('Error Response: ${error.response?.data}');
          print('Error Status Code: ${error.response?.statusCode}');
          print('Headers sent: ${error.requestOptions.headers}');
          return handler.next(error);
        },
      ),
    );
  }

  Future<List<Map<String, dynamic>>> getAvailableAssets(bool isBuy) async {
    try {
      final response = await _dio.get(
        '/p2p/available-assets',
        queryParameters: {'type': isBuy ? 'buy' : 'sell'},
      );
      
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      throw Exception('Failed to load assets');
    } catch (e) {
      throw Exception('Failed to load assets: $e');
    }
  }

  Future<Map<String, dynamic>> getTraderSettings() async {
    try {
      print('Attempting to get trader settings...');
      final response = await _dio.get('/p2p/trader-settings');
      print('Response received: ${response.data}');
      
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
      throw Exception('Failed to load trader settings');
    } catch (e) {
      print('Error in getTraderSettings: $e');
      throw Exception('Failed to load trader settings: $e');
    }
  }

  Future<double> getMarketPrice(String tokenSymbol, String currency) async {
    try {
      print('Making request to: ${_dio.options.baseUrl}/p2p/market-price?symbol=$tokenSymbol&currency=$currency');
      final response = await _dio.get(
        '/p2p/market-price',
        queryParameters: {
          'symbol': tokenSymbol,
          'currency': currency,
        },
      );
      
      if (response.statusCode == 200) {
        print('Market price response: ${response.data}');
        return double.parse(response.data['price'].toString());
      }
      throw Exception('Failed to load market price');
    } catch (e) {
      print('Error getting market price: $e');
      throw Exception('Failed to load market price: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getPaymentMethods(bool isBuy) async {
    try {
      final response = await _dio.get(
        '/p2p/payment-methods',
        queryParameters: {'type': isBuy ? 'buy' : 'sell'},
      );
      
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      throw Exception('Failed to load payment methods');
    } catch (e) {
      throw Exception('Failed to load payment methods: $e');
    }
  }

  Future<void> createOffer(Map<String, dynamic> offerData) async {
    try {
      final response = await _dio.post(
        '/p2p/offers',
        data: offerData,
      );
      
      if (response.statusCode != 201) {
        throw Exception('Failed to create offer');
      }
    } catch (e) {
      throw Exception('Failed to create offer: $e');
    }
  }

  Future<Map<String, dynamic>> getUserKycLevel() async {
    try {
      final response = await _dio.get('/p2p/user-kyc-level');
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
      throw Exception('Failed to load KYC level');
    } catch (e) {
      throw Exception('Failed to load KYC level: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getMyOffers(bool isActive) async {
    try {
      final response = await _dio.get(
        '/p2p/my-offers',
        queryParameters: {
          'status': isActive ? 'active' : 'completed',
        },
      );
      
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      throw Exception('Failed to load offers');
    } catch (e) {
      throw Exception('Failed to load offers: $e');
    }
  }
} 