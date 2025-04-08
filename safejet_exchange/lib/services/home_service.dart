import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';
import '../services/service_locator.dart';

class HomeService {
  late final Dio _dio;
  final storage = const FlutterSecureStorage();
  final AuthService _authService = getIt<AuthService>();

  HomeService() {
    final baseUrl = _authService.baseUrl.replaceAll('/auth', '');
    print('HomeService initializing with base URL: $baseUrl');
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
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
            print('Request to ${options.path} with auth token');
          } else {
            print('WARNING: No auth token available for request to ${options.path}');
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          print('Response from ${response.requestOptions.path}: Status ${response.statusCode}');
          print('Response data: ${response.data}');
          return handler.next(response);
        },
        onError: (DioException error, handler) async {
          print('Error Response: ${error.response?.data}');
          print('Error Status Code: ${error.response?.statusCode}');
          print('Error URL: ${error.requestOptions.path}');
          print('Error Message: ${error.message}');
          
          if (error.response?.statusCode == 401) {
            print('Unauthorized error - token may be invalid');
            // Handle token refresh or logout
          }
          
          return handler.next(error);
        },
      ),
    );
  }

  Future<Map<String, dynamic>> getPortfolioSummary({
    String currency = 'USD',
    String timeframe = '24h',
  }) async {
    try {
      print('Fetching portfolio summary with currency: $currency, timeframe: $timeframe');
      final response = await _dio.get(
        '/home/portfolio-summary',
        queryParameters: {
          'currency': currency,
          'timeframe': timeframe,
        },
      );
      
      print('Portfolio data received: ${response.data}');
      
      // Validate response data
      if (response.data == null) {
        print('ERROR: Null response data received');
        throw 'Invalid response data';
      }
      
      if (response.data is! Map) {
        print('ERROR: Response data is not a map: ${response.data.runtimeType}');
        throw 'Invalid response format';
      }
      
      // Add default values for missing fields
      final Map<String, dynamic> data = Map<String, dynamic>.from(response.data);
      
      if (!data.containsKey('portfolio')) {
        print('WARNING: Portfolio data missing, adding default');
        data['portfolio'] = {
          'usdValue': 0,
          'localCurrencyValue': 0,
          'currency': currency,
          'exchangeRate': 1.0,
          'change': {
            'value': 0,
            'valueInLocalCurrency': 0,
            'percent': 0,
            'timeframe': timeframe,
          },
        };
      }
      
      if (!data.containsKey('allocation')) {
        print('WARNING: Allocation data missing, adding default');
        data['allocation'] = [];
      }
      
      if (!data.containsKey('chartData')) {
        print('WARNING: Chart data missing, adding default');
        data['chartData'] = [];
      }
      
      return data;
    } catch (e, stack) {
      print('Error fetching portfolio summary: $e');
      print('Stack trace: $stack');
      
      if (e is DioException) {
        final message = e.response?.data?['message'];
        if (message != null) {
          throw message;
        }
      }
      throw 'Failed to load portfolio data: $e';
    }
  }

  String formatCurrency(double value, String currency) {
    if (value == 0) {
      return '\$0.00';
    }
    
    // Format based on currency
    switch (currency.toUpperCase()) {
      case 'USD':
        return '\$${_formatNumber(value)}';
      case 'EUR':
        return '€${_formatNumber(value)}';
      case 'GBP':
        return '£${_formatNumber(value)}';
      case 'NGN':
        return '₦${_formatNumber(value)}';
      case 'BTC':
        // Show more decimal places for BTC
        return '${value.toStringAsFixed(8)} BTC';
      default:
        return '${_formatNumber(value)} $currency';
    }
  }
  
  String _formatNumber(double value) {
    // For large values, use K/M/B notation
    if (value >= 1000000000) {
      return '${(value / 1000000000).toStringAsFixed(2)}B';
    }
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(2)}M';
    }
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(2)}K';
    }
    
    // Standard formatting for values under 1000
    if (value < 0.01) {
      return value.toStringAsFixed(6);
    }
    return value.toStringAsFixed(2);
  }

  Future<Map<String, dynamic>> getMarketOverview() async {
    try {
      final response = await _dio.get('/home/market-overview');
      print('Response from /home/market-overview: Status ${response.statusCode}');
      print('Response data: ${response.data}');
      return response.data;
    } catch (e) {
      print('Error loading market overview: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getTrending() async {
    try {
      final response = await _dio.get('/home/trending');
      print('Response from /home/trending: Status ${response.statusCode}');
      print('Response data: ${response.data}');
      return response.data;
    } catch (e) {
      print('Error loading trending tokens: $e');
      rethrow;
    }
  }
} 