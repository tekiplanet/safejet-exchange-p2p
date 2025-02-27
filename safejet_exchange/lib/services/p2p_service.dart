import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import '../config/constants.dart';

class P2PService {
  final Dio _dio = GetIt.I<Dio>();

  Future<List<Map<String, dynamic>>> getAvailableAssets(bool isBuy) async {
    try {
      final response = await _dio.get(
        '/p2p/available-assets',
        queryParameters: {'type': isBuy ? 'buy' : 'sell'},
      );
      
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      throw Exception('Failed to load assets');
    } catch (e) {
      throw Exception('Failed to load assets: $e');
    }
  }
} 