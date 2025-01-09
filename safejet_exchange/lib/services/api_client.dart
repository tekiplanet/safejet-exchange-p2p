class ApiClient {
  final Dio _dio;
  final AuthProvider _authProvider;

  ApiClient(this._dio, this._authProvider) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onError: (DioException error, ErrorInterceptorHandler handler) async {
          if (error.response?.statusCode == 401) {
            // Log out user on 401 Unauthorized
            await _authProvider.logout();
            
            // Navigate to login screen
            navigatorKey.currentState?.pushNamedAndRemoveUntil(
              '/login',
              (route) => false,
            );
          }
          return handler.next(error);
        },
      ),
    );
  }
} 