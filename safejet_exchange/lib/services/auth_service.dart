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
          // Store temp token for 2FA
          await storage.write(key: 'tempToken', value: data['tempToken']);
          return {'requires2FA': true};
        }

        // Store tokens and user data
        await storage.write(key: 'accessToken', value: data['accessToken']);
        await storage.write(key: 'refreshToken', value: data['refreshToken']);
        await storage.write(key: 'user', value: json.encode(data['user']));

        return data;
      } else {
        final errorMessage = data['message'] ?? 'Login failed';
        print('Login error: $errorMessage'); // For debugging
        throw errorMessage;
      }
    } catch (e) {
      print('Login error details: $e'); // For debugging
      if (e is String) {
        throw e;
      }
      throw 'Network error. Please check your connection.';
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
      await storage.write(key: 'accessToken', value: data['accessToken']);
      await storage.write(key: 'refreshToken', value: data['refreshToken']);
      await storage.write(key: 'user', value: json.encode(data['user']));
      return data;
    } else {
      throw Exception(data['message'] ?? 'Registration failed');
    }
  }

  Future<Map<String, dynamic>> verifyEmail(String code) async {
    final token = await storage.read(key: 'accessToken');
    
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify-email'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'code': code,
        }),
      );

      final data = json.decode(response.body);

      if (response.statusCode == 200) {
        return data;
      } else {
        // Make sure we're throwing the actual error message from the backend
        final errorMessage = data['message'] ?? 'Email verification failed';
        print('Backend error: $errorMessage'); // For debugging
        throw errorMessage;
      }
    } catch (e) {
      print('Error details: $e'); // For debugging
      if (e is String) {
        throw e;
      }
      // If it's a network error or other type of error
      throw 'Network error. Please check your connection.';
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