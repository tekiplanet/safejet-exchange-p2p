import 'package:dio/dio.dart';
import '../models/kyc_level.dart';
import '../models/kyc_details.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class KYCService {
  final Dio _dio;
  final _storage = const FlutterSecureStorage();

  KYCService(this._dio);

  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await _storage.read(key: 'accessToken');
    print('Debug - Token being used: $token');
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
        throw Exception('Failed to load KYC details');
      }
    } catch (e) {
      print('Error getting KYC details: $e');
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
}