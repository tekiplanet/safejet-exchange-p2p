import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../models/exchange_rate.dart';

class ExchangeService {
  final Dio _dio = Dio(BaseOptions(
    baseURL: ApiConfig.baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  ));

  Future<ExchangeRate> getRates(String currency) async {
    try {
      final response = await _dio.get('/exchange-rates/$currency');
      return ExchangeRate.fromJson(response.data);
    } on DioError catch (e) {
      throw Exception('Failed to load exchange rates: ${e.message}');
    }
  }
} 