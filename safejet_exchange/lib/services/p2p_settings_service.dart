import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';

class P2PSettingsService {
  late final Dio _dio;
  final storage = const FlutterSecureStorage();
  final AuthService _authService = AuthService();

  P2PSettingsService() {
    _dio = Dio(BaseOptions(
      baseUrl: _authService.baseUrl,
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
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  Future<List<Map<String, dynamic>>> getCurrencies() async {
    try {
      final response = await _dio.get('/currencies');
      return List<Map<String, dynamic>>.from(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getSettings() async {
    try {
      final response = await _dio.get('/p2p-settings');
      return Map<String, dynamic>.from(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> settings) async {
    try {
      final response = await _dio.put('/p2p-settings', data: settings);
      return Map<String, dynamic>.from(response.data);
    } catch (e) {
      rethrow;
    }
  }
} 