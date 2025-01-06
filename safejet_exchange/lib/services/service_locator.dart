import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import './services.dart';

final getIt = GetIt.instance;

Future<void> setupServices() async {
  final prefs = await SharedPreferences.getInstance();
  getIt.registerSingleton<AddressService>(AddressService(prefs));

  // Setup Dio for KYC service
  final dio = Dio(BaseOptions(
    baseUrl: dotenv.env['API_URL'] ?? 'http://localhost:3000',
    headers: {
      'Content-Type': 'application/json',
    },
  ));
  getIt.registerSingleton<KYCService>(KYCService(dio));
} 