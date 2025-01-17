import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';
import '../services/service_locator.dart';

class WalletService {
  late final Dio _dio;
  final storage = const FlutterSecureStorage();
  final AuthService _authService = getIt<AuthService>();
  final _cache = <String, CacheEntry>{};
  final _cacheDuration = const Duration(minutes: 3);

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
    int page = 1,
    int limit = 20,
  }) async {
    try {
      // Check cache first
      final cacheKey = '${type ?? 'all'}-$currency-$page-$limit';
      final cachedData = _cache[cacheKey];
      
      if (cachedData != null && !cachedData.isExpired) {
        return cachedData.data;
      }

      final response = await _dio.get(
        '/wallet/balances',
        queryParameters: {
          if (type != null) 'type': type,
          'currency': currency,
          'page': page,
          'limit': limit,
        },
      );

      final data = response.data;
      
      // Cache the response
      _cache[cacheKey] = CacheEntry(
        data: data,
        timestamp: DateTime.now(),
      );

      return data;
    } catch (e) {
      print('Error fetching wallet balances: $e');
      // Return cached data if available, even if expired
      final cachedData = _cache[type ?? 'all'];
      if (cachedData != null) {
        return cachedData.data;
      }
      return {
        'balances': [],
        'total': 0.0,
        'change24h': 0.0,
        'changePercent24h': 0.0,
      };
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