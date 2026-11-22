class LiveHttpResponse {
  final int statusCode;
  final String body;
  const LiveHttpResponse({required this.statusCode, required this.body});
}

Future<LiveHttpResponse> postJson(String url, Map<String, dynamic> payload) async {
  return const LiveHttpResponse(
    statusCode: 501,
    body: '{"message":"Live HTTPS login on Web requires CORS-configured API bridge; use Local Evaluation Sandbox or native build."}',
  );
}
