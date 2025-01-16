import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';
import '../services/service_locator.dart';

class WalletService {
  late final Dio _dio;
  final storage = const FlutterSecureStorage();
  final AuthService _authService = getIt<AuthService>();

  WalletService() {
    final baseUrl = _authService.baseUrl.replaceAll('/auth', '');
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
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
        onError: (DioException error, handler) {
          print('Error Response: ${error.response?.data}');
          print('Error Status Code: ${error.response?.statusCode}');
          print('Error Headers: ${error.response?.headers}');
          return handler.next(error);
        },
      ),
    );
  }

  Future<Map<String, dynamic>> getBalances({
    String? type,
    String currency = 'USD',
  }) async {
    try {
      final response = await _dio.get(
        '/wallet/balances',
        queryParameters: {
          if (type != null) 'type': type,
          'currency': currency,
        },
      );

      // Ensure we have a valid response
      if (response.data == null) {
        return {
          'balances': [],
          'total': 0.0,
          'currency': currency,
        };
      }

      // Handle both array and map responses
      if (response.data is List) {
        return {
          'balances': response.data,
          'total': 0.0,
          'currency': currency,
        };
      }

      if (response.data is! Map<String, dynamic>) {
        return {
          'balances': [],
          'total': 0.0,
          'currency': currency,
        };
      }

      return {
        'balances': response.data['balances'] ?? [],
        'total': (response.data['total'] ?? 0.0).toDouble(),
        'currency': currency,
      };
    } catch (e) {
      print('Error fetching wallet balances: $e');
      return {
        'balances': [],
        'total': 0.0,
        'currency': currency,
      };
    }
  }
} 