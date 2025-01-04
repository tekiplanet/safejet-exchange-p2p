import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import './address_service.dart';

final getIt = GetIt.instance;

Future<void> setupServices() async {
  final prefs = await SharedPreferences.getInstance();
  getIt.registerSingleton<AddressService>(AddressService(prefs));
} 