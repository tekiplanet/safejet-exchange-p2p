import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/env/env_config.dart';

class AuthService {
  final String baseUrl = EnvConfig.authBaseUrl;
  final storage = const FlutterSecureStorage();

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
      print('Verifying 2FA with token: $tempToken'); // Debug log
      
      final response = await http.post(
        Uri.parse('$baseUrl/verify-2fa'),
        headers: {
          'Content-Type': 'application/json',
          if (tempToken != null) 'Authorization': 'Bearer $tempToken',
        },
        body: json.encode({
          'email': email,
          'code': code,
        }),
      );

      print('2FA verification response: ${response.body}'); // Debug log
      final data = json.decode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Store the new tokens after successful 2FA
        await storage.write(key: 'accessToken', value: data['accessToken']);
        await storage.write(key: 'refreshToken', value: data['refreshToken']);
        await storage.write(key: 'user', value: json.encode(data['user']));
        
        // Clean up temp token
        await storage.delete(key: 'tempToken');

        return data;
      }

      throw data['message'] ?? 'Failed to verify 2FA code';
    } catch (e) {
      print('2FA verification error: $e'); // Debug log
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
      final userJson = await storage.read(key: 'user');
      if (userJson == null) throw 'No user data found';
      return json.decode(userJson);
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
      final response = await http.post(
        Uri.parse('$baseUrl/send-phone-verification'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final data = json.decode(response.body);
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw data['message'] ?? 'Failed to send verification code';
      }
    } catch (e) {
      print('Send phone verification error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> verifyPhone(String code) async {
    try {
      final token = await storage.read(key: 'accessToken');
      final response = await http.post(
        Uri.parse('$baseUrl/verify-phone'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'code': code}),
      );

      final data = json.decode(response.body);
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw data['message'] ?? 'Failed to verify phone';
      }

      return data;
    } catch (e) {
      print('Verify phone error: $e');
      rethrow;
    }
  }
} 