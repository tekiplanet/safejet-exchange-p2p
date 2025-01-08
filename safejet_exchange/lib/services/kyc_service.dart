import 'package:dio/dio.dart';
import '../models/kyc_level.dart';
import '../models/kyc_details.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class KYCService {
  final Dio _dio;
  final _storage = const FlutterSecureStorage();

  KYCService(Dio dio) : _dio = dio {
    _dio.options.baseUrl = dotenv.env['API_URL'] ?? 'http://localhost:3000';
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 3);
  }

  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await _storage.read(key: 'accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<KYCDetails> getUserKYCDetails() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.get(
        '/kyc/details',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        return KYCDetails.fromJson(response.data);
      } else {
        throw Exception('Failed to load KYC details: ${response.statusMessage}');
      }
    } catch (e) {
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout) {
          throw Exception('Connection timeout. Please check your internet connection.');
        } else if (e.response?.statusCode == 401) {
          throw Exception('Unauthorized. Please log in again.');
        }
        throw Exception('Network error: ${e.message}');
      }
      rethrow;
    }
  }

  Future<List<KYCLevel>> getAllKYCLevels() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.get(
        '/kyc/levels',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        return (response.data as List)
            .map((level) => KYCLevel.fromJson(level))
            .toList();
      } else {
        throw Exception('Failed to load KYC levels');
      }
    } catch (e) {
      print('Error getting KYC levels: $e');
      rethrow;
    }
  }

  Future<Map<String, String>> startDocumentVerification() async {
    try {
      final token = await getAccessToken();
      
      return {
        'token': token,
        'status': 'pending',
        'message': 'Please complete your verification',
      };
    } catch (e) {
      print('Error starting document verification: $e');
      rethrow;
    }
  }

  Future<void> startAddressVerification() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.post(
        '/kyc/access-token',
        options: Options(headers: headers),
      );
      
      if (response.statusCode == 200) {
        return response.data['token'];
      }
      
      throw Exception('Failed to get access token');
    } catch (e) {
      print('Address verification error: $e');
      rethrow;
    }
  }

  Future<Map<String, String>> getVerificationStatus() async {
    try {
      final token = await _storage.read(key: 'accessToken');
      final response = await _dio.get(
        '/kyc/verification-status',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );
      return {
        'status': response.data['status'],
        'message': response.data['message'],
      };
    } catch (e) {
      print('Error getting verification status: $e');
      rethrow;
    }
  }

  Future<void> submitIdentityDetails({
    required String firstName,
    required String lastName,
    required String dateOfBirth,
    required String address,
    required String city,
    required String state,
    required String country,
  }) async {
    try {
      print('Sending request to API:');
      print('URL: ${_dio.options.baseUrl}/auth/identity-details');
      print('Data: {');
      print('  firstName: $firstName,');
      print('  lastName: $lastName,');
      print('  dateOfBirth: $dateOfBirth,');
      print('  address: $address,');
      print('  city: $city,');
      print('  state: $state,');
      print('  country: $country');
      print('}');

      final token = await _storage.read(key: 'accessToken');
      final response = await _dio.put(
        '/auth/identity-details',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'dateOfBirth': dateOfBirth,
          'address': address,
          'city': city,
          'state': state,
          'country': country,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      print('API Response: ${response.data}');
      return response.data;
    } catch (e) {
      print('API Error: $e');
      if (e is DioException) {
        print('Response data: ${e.response?.data}');
        print('Response status: ${e.response?.statusCode}');
        print('Response headers: ${e.response?.headers}');
      }
      rethrow;
    }
  }

  Future<String> getAccessToken() async {
    try {
      final headers = await _getAuthHeaders();
      final response = await _dio.post(
        '/kyc/access-token',
        options: Options(headers: headers),
      );
      
      return response.data['token'];
    } catch (e) {
      print('Error getting access token: $e');
      rethrow;
    }
  }
}