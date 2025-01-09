import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import './services.dart';
import '../providers/auth_provider.dart';
import 'api_client.dart';

final getIt = GetIt.instance;

Future<void> setupServices() async {
  final prefs = await SharedPreferences.getInstance();
  getIt.registerSingleton<AddressService>(AddressService(prefs));

  // Register Dio
  final dio = Dio();
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
    error: true,
  ));

  // Register AuthProvider
  getIt.registerSingleton<AuthProvider>(AuthProvider());

  // Register ApiClient with auth interceptor
  getIt.registerSingleton<ApiClient>(
    ApiClient(dio, getIt<AuthProvider>()),
  );

  // Use the ApiClient's dio instance for all services
  getIt.registerSingleton<KYCService>(
    KYCService(getIt<ApiClient>().dio),
  );
} 