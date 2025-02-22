import 'package:flutter/material.dart';
import '../config/theme/colors.dart';
import '../services/wallet_service.dart';
import 'package:get_it/get_it.dart';

class SavedAddressesModal extends StatefulWidget {
  final String blockchain;
  final String network;

  const SavedAddressesModal({
    super.key,
    required this.blockchain,
    required this.network,
  });

  @override
  State<SavedAddressesModal> createState() => _SavedAddressesModalState();
}

class _SavedAddressesModalState extends State<SavedAddressesModal> {
  final _walletService = GetIt.I<WalletService>();
  bool _isLoading = true;
  List<dynamic> _addresses = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      setState(() => _isLoading = true);
      
      final addresses = await _walletService.getAddressBook();
      
      // Filter addresses by blockchain and network
      final filteredAddresses = addresses.where((address) =>
        address['blockchain'].toString().toLowerCase() == widget.blockchain.toLowerCase() &&
        address['network'].toString().toLowerCase() == widget.network.toLowerCase()
      ).toList();

      setState(() {
        _addresses = filteredAddresses;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load addresses';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: isDark ? SafeJetColors.primaryBackground : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Saved Addresses',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!))
                    : _addresses.isEmpty
                        ? Center(
                            child: Text(
                              'No saved addresses found for ${widget.blockchain}',
                              style: TextStyle(
                                color: isDark ? Colors.grey[400] : Colors.grey[600],
                              ),
                            ),
                          )
                        : ListView.builder(
                            itemCount: _addresses.length,
                            padding: const EdgeInsets.all(16),
                            itemBuilder: (context, index) {
                              final address = _addresses[index];
                              return ListTile(
                                title: Text(
                                  address['name'] ?? 'Unnamed Address',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      address['address'],
                                      style: TextStyle(
                                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                                      ),
                                    ),
                                    if (address['memo'] != null)
                                      Text(
                                        'Memo: ${address['memo']}',
                                        style: TextStyle(
                                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                                        ),
                                      ),
                                    if (address['tag'] != null)
                                      Text(
                                        'Tag: ${address['tag']}',
                                        style: TextStyle(
                                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                                        ),
                                      ),
                                  ],
                                ),
                                onTap: () => Navigator.pop(context, address),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
} 