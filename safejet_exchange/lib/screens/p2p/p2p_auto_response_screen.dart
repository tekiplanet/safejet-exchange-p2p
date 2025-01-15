import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:animate_do/animate_do.dart';
import 'package:shimmer/shimmer.dart';
import '../../config/theme/colors.dart';
import '../../config/theme/theme_provider.dart';
import '../../widgets/p2p_app_bar.dart';
import '../../providers/auto_response_provider.dart';

class P2PAutoResponseScreen extends StatefulWidget {
  const P2PAutoResponseScreen({super.key});

  @override
  State<P2PAutoResponseScreen> createState() => _P2PAutoResponseScreenState();
}

class _P2PAutoResponseScreenState extends State<P2PAutoResponseScreen> {
  final List<Map<String, dynamic>> _responses = [
    {
      'id': '1',
      'message': 'I have made the payment, please check.',
      'type': 'Payment',
      'icon': Icons.payment,
      'color': const Color(0xFF4CAF50),
    },
    {
      'id': '2',
      'message': 'Please provide your payment details.',
      'type': 'Request',
      'icon': Icons.request_page,
      'color': Color(0xFF2196F3),
    },
    {
      'id': '3',
      'message': 'Payment received, releasing crypto now.',
      'type': 'Confirmation',
      'icon': Icons.check_circle,
      'color': Color(0xFF9C27B0),
    },
    {
      'id': '4',
      'message': 'Thank you for trading with me!',
      'type': 'Thanks',
      'icon': Icons.favorite,
      'color': Color(0xFFE91E63),
    },
  ];

  final _messageController = TextEditingController();
  final _typeController = TextEditingController();
  IconData? _selectedIcon;
  Color _selectedColor = const Color(0xFF4CAF50);

  final List<Map<String, dynamic>> _availableIcons = [
    {'icon': Icons.payment, 'label': 'Payment'},
    {'icon': Icons.request_page, 'label': 'Request'},
    {'icon': Icons.check_circle, 'label': 'Confirmation'},
    {'icon': Icons.favorite, 'label': 'Thanks'},
    {'icon': Icons.warning, 'label': 'Warning'},
    {'icon': Icons.info, 'label': 'Info'},
  ];

  final List<Color> _availableColors = [
    const Color(0xFF4CAF50),
    const Color(0xFF2196F3),
    const Color(0xFF9C27B0),
    const Color(0xFFE91E63),
    const Color(0xFFFFC107),
    const Color(0xFF607D8B),
  ];

  final Map<String, IconData> _iconMap = {
    'payment': Icons.payment,
    'request_page': Icons.request_page,
    'check_circle': Icons.check_circle,
    'favorite': Icons.favorite,
    'warning': Icons.warning,
    'info': Icons.info,
    'message': Icons.message,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AutoResponseProvider>().loadResponses();
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _typeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: P2PAppBar(
        title: 'Quick Responses',
        hasNotification: false,
        onThemeToggle: () {
          themeProvider.toggleTheme();
        },
      ),
      body: Column(
        children: [
          _buildHeader(isDark),
          Expanded(
            child: Consumer<AutoResponseProvider>(
              builder: (context, provider, child) {
                if (provider.isLoading) {
                  return _buildShimmerLoading(isDark);
                }

                if (provider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          provider.error!,
                          style: TextStyle(color: SafeJetColors.error),
                        ),
                        ElevatedButton(
                          onPressed: () => provider.loadResponses(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: provider.responses.length,
                  itemBuilder: (context, index) {
                    return FadeInUp(
                      duration: const Duration(milliseconds: 300),
                      delay: Duration(milliseconds: index * 100),
                      child: _buildResponseCard(provider.responses[index], isDark),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddResponseDialog(isDark),
        backgroundColor: SafeJetColors.secondaryHighlight,
        icon: const Icon(Icons.add),
        label: const Text('New Response'),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? SafeJetColors.primaryAccent.withOpacity(0.1)
            : SafeJetColors.lightCardBackground,
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? SafeJetColors.primaryAccent.withOpacity(0.2)
                : SafeJetColors.lightCardBorder,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: SafeJetColors.secondaryHighlight.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.quickreply,
                  color: SafeJetColors.secondaryHighlight,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Quick Responses',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Manage your automated chat responses',
                      style: TextStyle(
                        color: isDark ? Colors.grey[400] : SafeJetColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResponseCard(Map<String, dynamic> response, bool isDark) {
    final icon = _getIconData(response['icon'] as String);
    final color = Color(int.parse(
      (response['color'] as String).replaceFirst('#', 'FF'),
      radix: 16,
    ));

    return Dismissible(
      key: Key(response['id']),
      background: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: SafeJetColors.error,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.centerRight,
        child: const Icon(
          Icons.delete_outline,
          color: Colors.white,
        ),
      ),
      direction: DismissDirection.endToStart,
      onDismissed: (direction) {
        setState(() {
          _responses.remove(response);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Response deleted'),
            action: SnackBarAction(
              label: 'Undo',
              onPressed: () {
                setState(() {
                  _responses.add(response);
                });
              },
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: isDark
              ? SafeJetColors.primaryAccent.withOpacity(0.1)
              : SafeJetColors.lightCardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? SafeJetColors.primaryAccent.withOpacity(0.2)
                : SafeJetColors.lightCardBorder,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => _showEditResponseDialog(response, isDark),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(icon, color: color),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          response['type'],
                          style: TextStyle(
                            color: color,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => _showEditResponseDialog(response, isDark),
                        icon: const Icon(Icons.edit_outlined),
                        iconSize: 20,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    response['message'],
                    style: const TextStyle(
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showAddResponseDialog(bool isDark) {
    _messageController.clear();
    _typeController.clear();
    _selectedIcon = Icons.message;
    _selectedColor = const Color(0xFF4CAF50);
    
    _showResponseDialog(
      isDark,
      isEdit: false,
      onSave: (message, type) {
        context.read<AutoResponseProvider>().addResponse({
          'id': DateTime.now().toString(),
          'message': message,
          'type': type,
          'icon': _getIconString(_selectedIcon ?? Icons.message),
          'color': '#${_selectedColor.value.toRadixString(16).substring(2)}',
        });
      },
    );
  }

  void _showEditResponseDialog(Map<String, dynamic> response, bool isDark) {
    _messageController.text = response['message'];
    _typeController.text = response['type'];
    _selectedIcon = _getIconData(response['icon']);
    _selectedColor = Color(int.parse(
      response['color'].replaceFirst('#', 'FF'),
      radix: 16,
    ));
    
    _showResponseDialog(
      isDark,
      isEdit: true,
      onSave: (message, type) {
        context.read<AutoResponseProvider>().updateResponse(
          response['id'],
          {
            'id': response['id'],
            'message': message,
            'type': type,
            'icon': _getIconString(_selectedIcon ?? Icons.message),
            'color': '#${_selectedColor.value.toRadixString(16).substring(2)}',
          },
        );
      },
    );
  }

  void _showResponseDialog(
    bool isDark, {
    required bool isEdit,
    required Function(String message, String type) onSave,
  }) {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
          backgroundColor: isDark ? const Color(0xFF1A1F2E) : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _selectedColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _selectedIcon ?? Icons.message,
                          color: _selectedColor,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          isEdit ? 'Edit Response' : 'Add New Response',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: Icon(
                          Icons.close,
                          color: isDark ? Colors.white54 : Colors.black54,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Type Field
                  Text(
                    'Response Type',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _typeController,
                    decoration: InputDecoration(
                      hintText: 'e.g., Payment, Request, Confirmation',
                      filled: true,
                      fillColor: isDark 
                          ? Colors.white.withOpacity(0.05)
                          : Colors.black.withOpacity(0.05),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      prefixIcon: Icon(
                        Icons.label_outline,
                        color: _selectedColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Message Field
                  Text(
                    'Message',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _messageController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Enter your response message',
                      filled: true,
                      fillColor: isDark 
                          ? Colors.white.withOpacity(0.05)
                          : Colors.black.withOpacity(0.05),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Icon Selection
                  Text(
                    'Select Icon',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 56,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _availableIcons.length,
                      itemBuilder: (context, index) {
                        final icon = _availableIcons[index]['icon'] as IconData;
                        final isSelected = icon == _selectedIcon;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Tooltip(
                            message: _availableIcons[index]['label'] as String,
                            child: InkWell(
                              onTap: () {
                                setDialogState(() {
                                  _selectedIcon = icon;
                                });
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                width: 56,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? _selectedColor.withOpacity(0.2)
                                      : isDark
                                          ? Colors.white.withOpacity(0.05)
                                          : Colors.black.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(8),
                                  border: isSelected
                                      ? Border.all(color: _selectedColor)
                                      : null,
                                ),
                                child: Icon(
                                  icon,
                                  color: isSelected ? _selectedColor : null,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Color Selection
                  Text(
                    'Select Color',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 56,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _availableColors.length,
                      itemBuilder: (context, index) {
                        final color = _availableColors[index];
                        final isSelected = color == _selectedColor;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: InkWell(
                            onTap: () {
                              setDialogState(() {
                                _selectedColor = color;
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 56,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                                border: isSelected
                                    ? Border.all(color: color)
                                    : null,
                              ),
                              child: Center(
                                child: Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                  ),
                                  child: isSelected
                                      ? const Icon(
                                          Icons.check,
                                          color: Colors.white,
                                          size: 16,
                                        )
                                      : null,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            'Cancel',
                            style: TextStyle(
                              color: isDark ? Colors.white70 : Colors.black54,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            if (_messageController.text.isNotEmpty && 
                                _typeController.text.isNotEmpty) {
                              onSave(_messageController.text, _typeController.text);
                              Navigator.pop(context);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _selectedColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(isEdit ? 'Save Changes' : 'Add Response'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _handleDelete(Map<String, dynamic> response) {
    // ... your existing delete dialog code ...
    // When confirmed:
    context.read<AutoResponseProvider>().deleteResponse(response['id']);
  }

  Widget _buildShimmerLoading(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (context, index) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: _buildShimmerCard(isDark),
      ),
    );
  }

  Widget _buildShimmerCard(bool isDark) {
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 80,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              height: 16,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getIconData(String iconName) {
    return _iconMap[iconName] ?? Icons.message;
  }

  String _getIconString(IconData icon) {
    return _iconMap.entries
        .firstWhere(
          (entry) => entry.value == icon,
          orElse: () => const MapEntry('message', Icons.message),
        )
        .key;
  }
} 