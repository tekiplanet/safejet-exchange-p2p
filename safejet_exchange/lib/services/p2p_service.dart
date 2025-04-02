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

  Future<Map<String, dynamic>> createOffer(Map<String, dynamic> offerData) async {
    try {
      final response = await _dio.post(
        '/p2p/offers',
        data: offerData,
      );

      if (response.statusCode != 201) {
        throw Exception('Failed to process offer');
      }

      return response.data;
    } catch (e) {
      throw Exception('Failed to process offer: $e');
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

  Future<List<Map<String, dynamic>>> getMyOffers(bool isBuy) async {
    try {
      final response = await _dio.get(
        '/p2p/my-offers',
        queryParameters: {
          'type': isBuy ? 'buy' : 'sell',
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

  Future<Map<String, dynamic>> getPublicOffers({
    required bool isBuy,
    String? currency,
    String? tokenId,
    String? paymentMethodId,
    double? minAmount,
    int page = 1,
  }) async {
    try {
      final queryParams = {
        'type': isBuy ? 'buy' : 'sell',
        if (currency != null) 'currency': currency,
        if (tokenId != null) 'tokenId': tokenId,
        if (paymentMethodId != null) 'paymentMethodId': paymentMethodId,
        if (minAmount != null) 'minAmount': minAmount.toString(),
        'page': page,
      };
      print('Query parameters being sent: $queryParams');
      
      final response = await _dio.get(
        '/p2p/public-offers',
        queryParameters: queryParams,
      );
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getActiveCurrencies() async {
    try {
      final response = await _dio.get('/p2p/currencies');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Map<String, dynamic>>> getActivePaymentMethodTypes() async {
    try {
      final response = await _dio.get('/p2p/payment-method-types');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getOfferDetails(String offerId) async {
    final response = await _dio.get('/p2p/offer-details', queryParameters: {'offerId': offerId});
    return response.data;
  }

  Future<Map<String, dynamic>> submitOrder(Map<String, dynamic> orderData) async {
    try {
      final response = await _dio.post(
        '/p2p/orders',
        data: orderData,
      );

      if (response.statusCode == 201) {
        print('Order submitted successfully');
        return response.data;
      } else {
        throw Exception('Failed to submit order');
      }
    } catch (e) {
      print('Error submitting order: $e');
      throw Exception('Error submitting order');
    }
  }

  Future<Map<String, dynamic>> getOrderDetails(String trackingId) async {
    try {
      final token = await storage.read(key: 'accessToken');
      final headers = token != null ? <String, dynamic>{'Authorization': 'Bearer $token'} : <String, dynamic>{};
      
      final response = await _dio.get(
        '/p2p/orders/$trackingId',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        print('Order details fetched successfully: ${response.data}');
        return response.data;
      } else {
        throw Exception('Failed to load order details');
      }
    } catch (e) {
      print('Error fetching order details: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getPaymentMethodDetails(String methodId) async {
    try {
      final token = await storage.read(key: 'accessToken');
      final headers = token != null ? <String, dynamic>{'Authorization': 'Bearer $token'} : <String, dynamic>{};
      
      final response = await _dio.get(
        '/p2p/payment-methods/$methodId',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        print('Payment method details fetched successfully: ${response.data}');
        return response.data;
      } else {
        throw Exception('Failed to load payment method details');
      }
    } catch (e) {
      print('Error fetching payment method details: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getOrders({
    bool? isBuy,
    String? status,
    String? searchQuery,
    int page = 1,
  }) async {
    try {
      final queryParams = {
        if (isBuy != null) 'type': isBuy ? 'buy' : 'sell',
        if (status != null && status.toLowerCase() != 'all') 'status': status.toLowerCase(),
        if (searchQuery != null && searchQuery.isNotEmpty) 'search': searchQuery,
        'page': page.toString(),
      };

      final response = await _dio.get(
        '/p2p/orders',
        queryParameters: queryParams,
        options: Options(headers: await _getAuthHeaders()),
      );

      return response.data;
    } catch (e) {
      _handleError(e);
      rethrow;
    }
  }

  Exception _handleError(dynamic e) {
    if (e is DioException) {
      final response = e.response;
      if (response != null) {
        final data = response.data;
        if (data is Map && data.containsKey('message')) {
          return Exception(data['message']);
        }
      }
      return Exception(e.message ?? 'An error occurred');
    }
    return Exception(e.toString());
  }

  Future<Map<String, dynamic>> _getAuthHeaders() async {
    final token = await storage.read(key: 'accessToken');
    return token != null ? <String, dynamic>{'Authorization': 'Bearer $token'} : <String, dynamic>{};
  }
} 