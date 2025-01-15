import 'package:dio/dio.dart';
import 'package:local_auth/local_auth.dart';
import '../services/auth_service.dart';

class BiometricSettingsService {
  late final Dio _dio;
  final AuthService _authService = AuthService();
  final LocalAuthentication _localAuth = LocalAuthentication();

  BiometricSettingsService() {
    final baseUrl = _authService.baseUrl;
    
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
          final token = await _authService.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  Future<bool> isBiometricAvailable() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      print('Error checking biometric availability: $e');
      return false;
    }
  }

  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      print('Error getting available biometrics: $e');
      return [];
    }
  }

  Future<bool> authenticate() async {
    try {
      return await _localAuth.authenticate(
        localizedReason: 'Authenticate to enable biometric login',
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } catch (e) {
      print('Error authenticating: $e');
      return false;
    }
  }

  Future<bool> getBiometricStatus() async {
    try {
      final response = await _dio.get('/me');
      return response.data['biometricEnabled'] as bool;
    } catch (e) {
      print('Error fetching biometric status: $e');
      rethrow;
    }
  }

  Future<void> updateBiometricStatus(bool enabled) async {
    try {
      await _dio.put(
        '/biometric',
        data: {
          'enabled': enabled,
        },
      );
    } catch (e) {
      print('Error updating biometric status: $e');
      rethrow;
    }
  }
} 