import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../services/payment_methods_service.dart';
import '../models/payment_method.dart';
import '../models/payment_method_type.dart';

class PaymentMethodsProvider with ChangeNotifier {
  final PaymentMethodsService _service;
  List<PaymentMethod> _paymentMethods = [];
  List<PaymentMethodType> _paymentMethodTypes = [];
  bool _isLoading = false;
  String? _error;
  BuildContext? _context;

  PaymentMethodsProvider(this._service);

  void setContext(BuildContext context) {
    _context = context;
  }

  List<PaymentMethod> get paymentMethods => _paymentMethods;
  List<PaymentMethodType> get paymentMethodTypes => _paymentMethodTypes;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadPaymentMethodTypes() async {
    try {
      _isLoading = true;
      notifyListeners();

      _paymentMethodTypes = await _service.getPaymentMethodTypes(_context!);
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadPaymentMethods() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      if (_context == null) {
        throw 'Context not set';
      }

      _paymentMethods = await _service.getPaymentMethods(_context!);
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> createPaymentMethod(Map<String, dynamic> data) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final newMethod = await _service.createPaymentMethod(data);
      _paymentMethods = [..._paymentMethods, newMethod];

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> updatePaymentMethod(String id, Map<String, dynamic> data) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final updatedMethod = await _service.updatePaymentMethod(id, data);
      _paymentMethods = _paymentMethods.map((method) {
        return method.id == id ? updatedMethod : method;
      }).toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> deletePaymentMethod(String id) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      await _service.deletePaymentMethod(id);
      _paymentMethods = _paymentMethods.where((method) => method.id != id).toList();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
} 