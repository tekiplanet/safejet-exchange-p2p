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

      if (response.statusCode == 200) {
        if (data['requires2FA'] == true) {
          await storage.write(key: 'tempToken', value: data['tempToken']);
          return {'requires2FA': true};
        }

        // Store tokens and user data
        await storage.write(key: 'accessToken', value: data['accessToken']);
        await storage.write(key: 'refreshToken', value: data['refreshToken']);
        await storage.write(key: 'user', value: json.encode(data['user']));

        return data;
      } else {
        // If email is not verified, store the user ID for verification
        if (data['message']?.contains('verify your email') == true) {
          await storage.write(key: 'pendingUserId', value: data['userId']);
        }
        
        final errorMessage = data['message'] ?? 'Login failed';
        throw errorMessage;
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    await storage.deleteAll();
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
      // Try to get userId from both registration and login flows
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

      if (response.statusCode == 200) {
        // Update tokens
        await storage.write(key: 'accessToken', value: data['accessToken']);
        await storage.write(key: 'refreshToken', value: data['refreshToken']);
        await storage.write(key: 'user', value: json.encode(data['user']));
        // Clean up
        await storage.delete(key: 'pendingUserId');
        return data;
      } else {
        throw data['message'] ?? 'Email verification failed';
      }
    } catch (e) {
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

      if (response.statusCode == 200) {
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
      
      final response = await http.post(
        Uri.parse('$baseUrl/verify-2fa'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $tempToken',
        },
        body: json.encode({
          'email': email,
          'code': code,
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        // Store the new tokens after successful 2FA
        await storage.write(key: 'accessToken', value: data['accessToken']);
        await storage.write(key: 'refreshToken', value: data['refreshToken']);
        await storage.write(key: 'user', value: json.encode(data['user']));
        
        // Clean up temp token
        await storage.delete(key: 'tempToken');

        return data;
      } else {
        final errorMessage = data['message'] ?? '2FA verification failed';
        print('2FA error: $errorMessage'); // For debugging
        throw errorMessage;
      }
    } catch (e) {
      print('2FA error details: $e'); // For debugging
      if (e is String) {
        throw e;
      }
      throw 'Network error. Please check your connection.';
    }
  }
} 