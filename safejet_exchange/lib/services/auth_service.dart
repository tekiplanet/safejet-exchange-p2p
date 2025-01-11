import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/env/env_config.dart';
import 'package:dio/dio.dart';

class AuthService {
  final String baseUrl = EnvConfig.authBaseUrl;
  final storage = const FlutterSecureStorage();
  late final Dio _dio;

  AuthService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 3),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptor for logging
    _dio.interceptors.add(LogInterceptor(
      request: true,
      requestHeader: true,
      requestBody: true,
      responseHeader: true,
      responseBody: true,
      error: true,
    ));
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      final data = json.decode(response.body);
      print('Raw Response Status Code: ${response.statusCode}');
      print('Raw Response Body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Handle 2FA case
        if (data['requires2FA'] == true) {
          await storage.write(key: 'tempToken', value: data['tempToken']);
          return {'requires2FA': true, 'email': email};
        }

        // Store tokens and user data for successful login
        await storage.write(key: 'accessToken', value: data['accessToken']);
        await storage.write(key: 'refreshToken', value: data['refreshToken']);
        await storage.write(key: 'user', value: json.encode(data['user']));

        return data;
      }

      throw data['message'] ?? 'Login failed';
    } catch (e) {
      print('Login error details: $e');
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      final token = await storage.read(key: 'accessToken');
      
      // Call backend logout endpoint
      await http.post(
        Uri.parse('$baseUrl/logout'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      // Clear all stored data
      await storage.deleteAll();
    } catch (e) {
      print('Logout error: $e');
      // Still clear local storage even if backend call fails
      await storage.deleteAll();
      rethrow;
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await storage.read(key: 'accessToken');
    return token != null;
  }

  Future<Map<String, dynamic>> register(
    String fullName,
    String email,
    String phone,
    String password,
    String countryCode,
    String countryName,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/register'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'password': password,
        'countryCode': countryCode,
        'countryName': countryName,
      }),
    );

    final data = json.decode(response.body);

    if (response.statusCode == 201 || response.statusCode == 200) {
      // Store tokens
      await storage.write(key: 'accessToken', value: data['accessToken']);
      await storage.write(key: 'refreshToken', value: data['refreshToken']);
      await storage.write(key: 'user', value: json.encode(data['user']));
      // Store userId for verification
      await storage.write(key: 'pendingUserId', value: data['user']['id']);
      return data;
    } else {
      throw data['message'] ?? 'Registration failed';
    }
  }

  Future<Map<String, dynamic>> verifyEmail(String code) async {
    try {
      final userId = await storage.read(key: 'pendingUserId');
      final accessToken = await storage.read(key: 'accessToken');

      if (userId == null && accessToken == null) {
        throw 'Session expired. Please try logging in again.';
      }

      final response = await http.post(
        Uri.parse('$baseUrl/verify-email'),
        headers: {
          'Content-Type': 'application/json',
          if (accessToken != null) 'Authorization': 'Bearer $accessToken',
        },
        body: json.encode({
          'userId': userId,
          'code': code,
        }),
      );

      final data = json.decode(response.body);
      print('Backend Response: $data');

      if (response.statusCode == 201 || response.statusCode == 200) {
        // Store tokens
        await storage.write(key: 'accessToken', value: data['accessToken']);
        await storage.write(key: 'refreshToken', value: data['refreshToken']);
        await storage.write(key: 'user', value: json.encode(data['user']));
        await storage.delete(key: 'pendingUserId');
        return data;
      }

      throw data['message'] ?? 'Email verification failed';
    } catch (e) {
      print('Verification error: $e');
      if (e.toString().contains('verified successfully')) {
        return {'status': 'success', 'message': e.toString()};
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> resendVerificationCode(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/resend-verification'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return data;
      } else {
        throw data['message'] ?? 'Failed to resend verification code';
      }
    } catch (e) {
      if (e is String) {
        throw e;
      }
      throw 'Failed to resend verification code';
    }
  }

  Future<Map<String, dynamic>> verify2FA(String email, String code) async {
    try {
      final tempToken = await storage.read(key: 'tempToken');
      print('Verifying 2FA with token: $tempToken');

      final response = await _dio.post(
        '/verify-2fa',
        data: {
          'email': email,
          'code': code,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $tempToken',
            'Content-Type': 'application/json',
          },
        ),
      );

      print('2FA verification response: ${response.data}');
      
      // Clean up temp token after successful verification
      await storage.delete(key: 'tempToken');
      
      return response.data;
    } catch (e) {
      if (e is DioException) {
        print('2FA verification error: ${e.response?.data['message']}');
        throw e.response?.data['message'] ?? 'Failed to verify 2FA code';
      }
      print('2FA verification error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
        }),
      );

      final data = json.decode(response.body);
      print('Forgot password response: $data');

      if (response.statusCode == 201 || response.statusCode == 200) {
        return data;
      }

      throw data['message'] ?? 'Failed to send reset code';
    } catch (e) {
      print('Forgot password error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> resetPassword(String email, String code, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'code': code,
          'newPassword': newPassword,
        }),
      );

      final data = json.decode(response.body);
      print('Reset password response: $data');

      if (response.statusCode == 201 || response.statusCode == 200) {
        return data;
      }

      throw data['message'] ?? 'Failed to reset password';
    } catch (e) {
      print('Reset password error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> generate2FASecret() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/2fa/generate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await storage.read(key: 'accessToken')}',
        },
      );

      final data = json.decode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return data;
      }

      throw data['message'] ?? 'Failed to generate 2FA secret';
    } catch (e) {
      print('Generate 2FA secret error: $e');
      rethrow;
    }
  }

  Future<void> storeTemp2FASecret(String secret) async {
    await storage.write(key: 'temp2FASecret', value: secret);
  }

  Future<Map<String, dynamic>> enable2FA(String code) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/2fa/enable'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await storage.read(key: 'accessToken')}',
        },
        body: json.encode({
          'code': code,
        }),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return data;
      }

      throw data['message'] ?? 'Failed to enable 2FA';
    } catch (e) {
      print('Enable 2FA error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> disable2FA(String code, String codeType) async {
    try {
      final token = await storage.read(key: 'accessToken');
      print('Using token for disable2FA: $token'); // Debug log

      final response = await http.post(
        Uri.parse('$baseUrl/2fa/disable'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'code': code,
          'codeType': codeType,
        }),
      );

      print('Disable 2FA response: ${response.body}'); // Debug log
      final data = json.decode(response.body);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return data;
      }

      throw data['message'] ?? 'Failed to disable 2FA';
    } catch (e) {
      print('Disable 2FA error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getBackupCodes() async {
    try {
      final token = await storage.read(key: 'accessToken');
      print('Getting backup codes with token: $token'); // Debug log

      final response = await http.get(
        Uri.parse('$baseUrl/2fa/backup-codes'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      print('Backup codes response status: ${response.statusCode}'); // Debug log
      print('Backup codes response body: ${response.body}'); // Debug log
      
      final data = json.decode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return data;
      }

      throw data['message'] ?? 'Failed to get backup codes';
    } catch (e) {
      print('Get backup codes error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      // First try to get from storage
      final userJson = await storage.read(key: 'user');
      if (userJson != null) {
        final localUser = json.decode(userJson);
        
        // Try to get fresh data from server
        try {
          final response = await _dio.get(
            '/me',
            options: Options(headers: await _getAuthHeaders()),
          );
          
          // Update stored user data
          final freshUserData = response.data;
          await storage.write(key: 'user', value: json.encode(freshUserData));
          return freshUserData;
        } catch (e) {
          print('Error fetching fresh user data: $e');
          // Return cached data if server request fails
          return localUser;
        }
      }
      
      // If no local data, must get from server
      final response = await _dio.get(
        '/me',
        options: Options(headers: await _getAuthHeaders()),
      );
      
      final userData = response.data;
      await storage.write(key: 'user', value: json.encode(userData));
      return userData;
    } catch (e) {
      print('Get current user error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updatePhone({
    required String phone,
    required String countryCode,
    required String countryName,
    required String phoneWithoutCode,
  }) async {
    try {
      final token = await storage.read(key: 'accessToken');
      if (token == null) {
        throw 'Authentication token not found';
      }
      
      final response = await http.put(
        Uri.parse('$baseUrl/update-phone'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'phone': phone,
          'countryCode': countryCode,
          'countryName': countryName,
          'phoneWithoutCode': phoneWithoutCode,
        }),
      );
      
      final data = json.decode(response.body);
      
      if (response.statusCode == 401) {
        final refreshed = await refreshToken();
        if (refreshed) {
          return updatePhone(
            phone: phone,
            countryCode: countryCode,
            countryName: countryName,
            phoneWithoutCode: phoneWithoutCode,
          );
        } else {
          throw 'Session expired. Please login again.';
        }
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Update stored user data
        final currentUser = await getCurrentUser();
        currentUser['phone'] = phone;
        currentUser['countryCode'] = countryCode;
        currentUser['countryName'] = countryName;
        currentUser['phoneWithoutCode'] = phoneWithoutCode;
        await storage.write(key: 'user', value: json.encode(currentUser));
        
        return data;
      }
      
      throw data['message'] ?? 'Failed to update phone number';
    } catch (e) {
      print('Update phone error: $e');
      rethrow;
    }
  }

  Future<void> sendPhoneVerification() async {
    try {
      final token = await storage.read(key: 'accessToken');
      if (token == null) {
        throw 'Authentication token not found';
      }

      final response = await http.post(
        Uri.parse('$baseUrl/send-phone-verification'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final data = json.decode(response.body);
      
      // Handle token expiration
      if (response.statusCode == 401) {
        // Try to refresh token
        final refreshed = await refreshToken();
        if (refreshed) {
          // Retry with new token
          return sendPhoneVerification();
        } else {
          throw 'Session expired. Please login again.';
        }
      }

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw data['message'] ?? 'Failed to send verification code';
      }
    } catch (e) {
      print('Send phone verification error: $e');
      rethrow;
    }
  }

  Future<bool> refreshToken() async {
    try {
      final refreshToken = await storage.read(key: 'refreshToken');
      if (refreshToken == null) return false;

      final response = await http.post(
        Uri.parse('$baseUrl/refresh-token'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        await storage.write(key: 'accessToken', value: data['accessToken']);
        return true;
      }
      return false;
    } catch (e) {
      print('Token refresh error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>> verifyPhone(String code) async {
    try {
      final token = await storage.read(key: 'accessToken');
      if (token == null) {
        throw 'Authentication token not found';
      }
      
      final response = await http.post(
        Uri.parse('$baseUrl/verify-phone'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'code': code}),
      );

      final data = json.decode(response.body);
      
      // Handle token expiration
      if (response.statusCode == 401) {
        // Try to refresh token
        final refreshed = await refreshToken();
        if (refreshed) {
          // Retry with new token
          return verifyPhone(code);
        } else {
          throw 'Session expired. Please login again.';
        }
      }

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw data['message'] ?? 'Failed to verify phone';
      }

      return data;
    } catch (e) {
      print('Verify phone error: $e');
      rethrow;
    }
  }

  Future<bool> verifyCurrentPassword(String currentPassword) async {
    try {
      if (currentPassword.isEmpty) {
        throw Exception('Please enter your current password');
      }

      final response = await _dio.post(
        '/verify-password',
        data: {
          'password': currentPassword,
        },
        options: Options(headers: await _getAuthHeaders()),
      );
      
      return response.data['valid'] == true;
    } catch (e) {
      if (e is DioException) {
        final message = e.response?.data['message'];
        switch (e.response?.statusCode) {
          case 401:
            throw Exception('Current password is incorrect. Please try again.');
          case 400:
            throw Exception(message ?? 'Please enter a valid password');
          case 429:
            throw Exception('Too many attempts. Please try again later.');
          default:
            print('Verify password error details: ${e.response?.data}');
            throw Exception('Unable to verify password. Please try again later.');
        }
      }
      throw Exception(e.toString());
    }
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    try {
      if (currentPassword.isEmpty) {
        throw Exception('Please enter your current password');
      }
      if (newPassword.isEmpty) {
        throw Exception('Please enter a new password');
      }

      await _dio.post(
        '/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
        options: Options(headers: await _getAuthHeaders()),
      );
    } catch (e) {
      if (e is DioException) {
        final message = e.response?.data['message'];
        switch (e.response?.statusCode) {
          case 401:
            throw Exception('Current password is incorrect. Please try again.');
          case 400:
            if (message?.contains('must be different') ?? false) {
              throw Exception('New password must be different from current password');
            }
            throw Exception(message ?? 'Please check your password requirements');
          case 429:
            throw Exception('Too many attempts. Please try again later.');
          default:
            print('Change password error details: ${e.response?.data}');
            throw Exception('Unable to change password. Please try again later.');
        }
      }
      throw Exception(e.toString());
    }
  }

  Future<Map<String, dynamic>> _getAuthHeaders() async {
    final accessToken = await storage.read(key: 'accessToken');
    return {
      'Authorization': 'Bearer $accessToken',
    };
  }

  Future<void> verify2FAForAction(String code) async {
    try {
      if (code.isEmpty) {
        throw Exception('Please enter the 2FA code');
      }
      if (code.length != 6) {
        throw Exception('2FA code must be 6 digits');
      }

      final response = await _dio.post(
        '/verify-2fa-action',
        data: {
          'code': code,
        },
        options: Options(headers: await _getAuthHeaders()),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception(response.data['message'] ?? 'Failed to verify 2FA code');
      }
    } catch (e) {
      if (e is DioException) {
        final message = e.response?.data['message'];
        switch (e.response?.statusCode) {
          case 400:
            throw Exception(message ?? 'Invalid 2FA code');
          case 401:
            throw Exception('Invalid or expired 2FA code');
          case 429:
            throw Exception('Too many attempts. Please try again later.');
          default:
            print('2FA verification error details: ${e.response?.data}');
            throw Exception('Unable to verify 2FA code. Please try again later.');
        }
      }
      throw Exception(e.toString());
    }
  }
} 