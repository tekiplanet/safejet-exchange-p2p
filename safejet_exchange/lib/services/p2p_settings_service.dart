import 'package:dio/dio.dart';
import '../config/api_config.dart';

class P2PSettingsService {
  final Dio _dio = ApiConfig.dio;

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