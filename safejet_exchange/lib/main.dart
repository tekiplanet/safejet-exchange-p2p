import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config/theme/theme_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import './services/service_locator.dart';
import 'providers/auth_provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'providers/kyc_provider.dart';
import './services/services.dart';
import 'package:dio/dio.dart';
import 'package:dio/dio.dart';
import 'providers/payment_methods_provider.dart';
import 'services/payment_methods_service.dart';
import './widgets/auth_wrapper.dart';
import './services/dio_interceptors.dart';
import 'providers/auto_response_provider.dart';
import '../services/p2p_settings_service.dart';
import 'providers/notification_settings_provider.dart';
import '../services/notification_settings_service.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  
  final dio = Dio();
  
  // Create AuthProvider first
  final authProvider = AuthProvider();

  // Add interceptors
  dio.interceptors.addAll([
    LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
    ),
    AuthInterceptor(authProvider, navigatorKey.currentContext),  // Pass global context
  ]);

  await setupServices();
  final prefs = await SharedPreferences.getInstance();
  final themeProvider = ThemeProvider()..init(prefs);
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: themeProvider),
        ChangeNotifierProvider.value(value: authProvider),  // Use the same instance
        ChangeNotifierProvider(
          create: (context) => KYCProvider(
            KYCService(dio),
          ),
        ),
        ChangeNotifierProvider(
          create: (context) => PaymentMethodsProvider(
            PaymentMethodsService(dio),
          ),
        ),
        ChangeNotifierProvider(
          create: (context) => AutoResponseProvider(
            P2PSettingsService(),
          ),
        ),
        ChangeNotifierProvider(
          create: (context) => NotificationSettingsProvider(
            NotificationSettingsService(),
          ),
        ),
      ],
      child: AuthWrapper(
        child: const MyApp(),
      ),
    ),
  );
}

Future<bool> isFirstLaunch() async {
  final prefs = await SharedPreferences.getInstance();
  final hasSeenOnboarding = prefs.getBool('hasSeenOnboarding') ?? false;
  return !hasSeenOnboarding;
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    return MaterialApp(
      title: 'SafeJet Exchange',
      debugShowCheckedModeBanner: false,
      theme: themeProvider.theme,
      navigatorKey: navigatorKey,
      home: FutureBuilder<bool>(
        future: isFirstLaunch(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const SplashScreen();
          }
          return snapshot.data == true
              ? const OnboardingScreen()
              : const LoginScreen();
        },
      ),
    );
  }
}
