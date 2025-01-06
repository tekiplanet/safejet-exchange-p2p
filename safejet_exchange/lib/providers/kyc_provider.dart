import 'package:flutter/material.dart';
import '../models/kyc_details.dart';
import '../models/kyc_level.dart';
import '../services/kyc_service.dart';

class KYCProvider extends ChangeNotifier {
  final KYCService _kycService;
  KYCDetails? _kycDetails;
  List<KYCLevel>? _kycLevels;
  bool _loading = false;

  KYCProvider(this._kycService);

  KYCDetails? get kycDetails => _kycDetails;
  List<KYCLevel>? get kycLevels => _kycLevels;
  bool get loading => _loading;

  Future<void> loadKYCDetails() async {
    try {
      _loading = true;
      notifyListeners();
      
      _kycDetails = await _kycService.getUserKYCDetails();
      notifyListeners();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadKYCLevels() async {
    try {
      _loading = true;
      notifyListeners();
      
      _kycLevels = await _kycService.getAllKYCLevels();
      notifyListeners();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
} 