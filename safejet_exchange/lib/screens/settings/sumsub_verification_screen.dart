import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../config/theme/colors.dart';
import '../../widgets/p2p_app_bar.dart';

class SumsubVerificationScreen extends StatefulWidget {
  final String accessToken;

  const SumsubVerificationScreen({
    Key? key,
    required this.accessToken,
  }) : super(key: key);

  @override
  State<SumsubVerificationScreen> createState() => _SumsubVerificationScreenState();
}

class _SumsubVerificationScreenState extends State<SumsubVerificationScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onNavigationRequest: (NavigationRequest request) {
            // Handle navigation if needed
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadHtmlString('''
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://static.sumsub.com/idensic/static/sns-websdk-builder.js"></script>
          </head>
          <body style="margin:0">
            <div id="sumsub-websdk-container"></div>
            <script>
              const accessToken = '${widget.accessToken}';
              
              let snsWebSdkInstance = snsWebSdk
                .init(accessToken)
                .withConf({
                  lang: 'en',
                  uiConf: {
                    customCssStr: 'body { background: #fff; }',
                  }
                })
                .on('onError', (error) => {
                  console.error('Error:', error);
                })
                .on('onActionCompleted', (action) => {
                  console.log('Action completed:', action);
                })
                .build();
              
              snsWebSdkInstance.launch('#sumsub-websdk-container');
            </script>
          </body>
        </html>
      ''');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const P2PAppBar(
        title: 'Identity Verification',
        hasNotification: false,
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
} 