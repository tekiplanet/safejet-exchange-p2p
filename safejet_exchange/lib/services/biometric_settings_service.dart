import 'package:dio/dio.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';
import 'dart:convert';
import 'dart:typed_data';

class BiometricSettingsService {
  late final Dio _dio;
  final AuthService _authService = AuthService();
  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _tokenKey = 'biometric_token';
  static const String _refreshTokenKey = 'biometric_refresh_token';

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

  Future<void> storeBiometricTokens(String token, String refreshToken) async {
    try {
      await _storage.write(key: _tokenKey, value: token);
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
    } catch (e) {
      print('Error storing biometric tokens: $e');
      rethrow;
    }
  }

  Future<Map<String, String?>> getBiometricTokens() async {
    try {
      final token = await _storage.read(key: _tokenKey);
      final refreshToken = await _storage.read(key: _refreshTokenKey);

      // If either token is missing, clear both
      if (token == null || refreshToken == null) {
        await clearBiometricTokens();
        return {
          'token': null,
          'refreshToken': null,
        };
      }

      // Check token validity
      final isValid = await isTokenValid(token);
      if (!isValid) {
        print('Clearing expired biometric tokens');
        await clearBiometricTokens();
        return {
          'token': null,
          'refreshToken': null,
        };
      }

      return {
        'token': token,
        'refreshToken': refreshToken,
      };
    } catch (e) {
      print('Error getting biometric tokens: $e');
      await clearBiometricTokens();
      return {
        'token': null,
        'refreshToken': null,
      };
    }
  }

  Future<void> clearBiometricTokens() async {
    try {
      await _storage.delete(key: _tokenKey);
      await _storage.delete(key: _refreshTokenKey);
    } catch (e) {
      print('Error clearing biometric tokens: $e');
      rethrow;
    }
  }

  Future<bool> isTokenValid(String token) {
    try {
      // Parse the JWT token
      final parts = token.split('.');
      if (parts.length != 3) return Future.value(false);

      final payload = json.decode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      
      // Check if token has expired
      final expiry = DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000);
      return Future.value(DateTime.now().isBefore(expiry));
    } catch (e) {
      print('Error checking token validity: $e');
      return Future.value(false);
    }
  }

  Future<bool> authenticateAndGetTokens() async {
    try {
      final tokens = await getBiometricTokens();
      if (tokens['token'] == null || tokens['refreshToken'] == null) {
        return false;
      }

      // Check if token is valid
      final isValid = await isTokenValid(tokens['token']!);
      if (!isValid) {
        print('Biometric token expired');
        await clearBiometricTokens();
        return false;
      }

      // Only prompt for biometric if tokens are valid
      final authenticated = await authenticate();
      return authenticated;
    } catch (e) {
      print('Error in biometric authentication: $e');
      return false;
    }
  }

  Future<void> updateBiometricStatus(bool enabled) async {
    try {
      if (enabled) {
        // Store current tokens when enabling biometric
        final token = await _authService.getAccessToken();
        final refreshToken = await _authService.getRefreshToken();
        if (token != null && refreshToken != null) {
          await storeBiometricTokens(token, refreshToken);
        }
      } else {
        // Clear stored tokens when disabling biometric
        await clearBiometricTokens();
      }

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