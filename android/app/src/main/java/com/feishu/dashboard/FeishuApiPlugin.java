package com.feishu.dashboard;

import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

@CapacitorPlugin(name = "FeishuApi")
public class FeishuApiPlugin extends Plugin {

    private static final String TAG = "FeishuApi";

    @PluginMethod
    public void request(PluginCall call) {
        String urlStr = call.getString("url");
        String method = call.getString("method", "GET");
        String body = call.getString("body");
        JSObject headersJS = call.getObject("headers", new JSObject());

        if (urlStr == null || urlStr.isEmpty()) {
            call.reject("url is required");
            return;
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Accept", "application/json");

                // JSObject to JSONObject for iteration
                JSONObject headersJson = new JSONObject(headersJS.toString());
                Iterator<String> keys = headersJson.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    conn.setRequestProperty(key, headersJson.getString(key));
                }

                if (body != null && !body.isEmpty() && !"GET".equals(method)) {
                    conn.setDoOutput(true);
                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = body.getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);
                    }
                }

                int responseCode = conn.getResponseCode();
                BufferedReader reader;
                if (responseCode >= 200 && responseCode < 300) {
                    reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                } else {
                    reader = new BufferedReader(new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8));
                }

                StringBuilder response = new StringBuilder();
                char[] buffer = new char[8192];
                int len;
                while ((len = reader.read(buffer)) != -1) {
                    response.append(buffer, 0, len);
                }
                reader.close();

                JSObject result = new JSObject();
                result.put("status", responseCode);
                result.put("body", response.toString());
                call.resolve(result);

            } catch (Exception e) {
                Log.e(TAG, "Request failed", e);
                call.reject("请求失败: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }).start();
    }
}
