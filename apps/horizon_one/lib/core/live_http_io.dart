import 'dart:convert';
import 'dart:io';
import 'live_http_stub.dart';

Future<LiveHttpResponse> postJson(String url, Map<String, dynamic> payload) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 6);
  try {
    final uri = Uri.parse(url);
    final req = await client.postUrl(uri);
    req.headers.contentType = ContentType.json;
    req.write(jsonEncode(payload));
    final resp = await req.close();
    final bodyStr = await resp.transform(utf8.decoder).join();
    return LiveHttpResponse(statusCode: resp.statusCode, body: bodyStr);
  } finally {
    client.close();
  }
}
