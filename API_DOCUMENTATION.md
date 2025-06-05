# API Documentation

## Overview

The AI Caption Generation API provides AI-powered image captioning services through a secure, scalable serverless endpoint. This documentation covers integration details, request/response formats, error handling, and iOS-specific implementation guidance.

## Base URL

```
Production: https://your-project.vercel.app
Development: http://localhost:3000
```

## Authentication

All requests require an app token sent via the `X-App-Token` header:

```
X-App-Token: your-uuid-token-here
```

## Endpoints

### POST /api/generateCaption

Generates an AI-powered caption for the provided image.

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `X-App-Token` | Yes | Your authentication token (UUID format) |

#### Request Body

```json
{
  "imageData": "base64-encoded-image-string",
  "mimeType": "image/jpeg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageData` | string | Yes | Base64 encoded image data |
| `mimeType` | string | Yes | Image MIME type (jpeg, png, webp, heic) |

#### Response Format

##### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "caption": "A beautiful sunset over the ocean with waves gently lapping at the shore, creating a peaceful and serene atmosphere.",
    "provider": "OpenAI",
    "model": "gpt-4-vision-preview",
    "confidence": "high",
    "usage": {
      "prompt_tokens": 1234,
      "completion_tokens": 56,
      "total_tokens": 1290
    },
    "processingTime": "2847ms",
    "requestId": "req_1641234567890_abc123"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:45.123Z",
    "provider": "openai",
    "requestId": "req_1641234567890_abc123",
    "processingTime": 2847,
    "imageSize": 245760,
    "mimeType": "image/jpeg"
  }
}
```

##### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Authentication failed",
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

## Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `AUTH_001` | 401 | Authentication failed | Check X-App-Token header |
| `VAL_001` | 400 | Request validation failed | Verify request body format |
| `AI_001` | 500 | AI provider error | Check API credits, retry request |
| `METHOD_001` | 405 | Method not allowed | Use POST method only |

## iOS Integration Guide

### Swift Implementation

```swift
import Foundation
import UIKit

class CaptionAPIClient {
    private let baseURL = "https://your-project.vercel.app"
    private let appToken = "your-app-token-here"
    
    func generateCaption(for image: UIImage) async throws -> CaptionResponse {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw APIError.invalidImage
        }
        
        let base64String = imageData.base64EncodedString()
        
        let requestBody = CaptionRequest(
            imageData: base64String,
            mimeType: "image/jpeg"
        )
        
        var request = URLRequest(url: URL(string: "\(baseURL)/api/generateCaption")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(appToken, forHTTPHeaderField: "X-App-Token")
        request.httpBody = try JSONEncoder().encode(requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 200 {
            return try JSONDecoder().decode(CaptionResponse.self, from: data)
        } else {
            let errorResponse = try JSONDecoder().decode(ErrorResponse.self, from: data)
            throw APIError.apiError(errorResponse.error)
        }
    }
}

// MARK: - Data Models

struct CaptionRequest: Codable {
    let imageData: String
    let mimeType: String
}

struct CaptionResponse: Codable {
    let success: Bool
    let data: CaptionData
    let metadata: ResponseMetadata
}

struct CaptionData: Codable {
    let caption: String
    let provider: String
    let model: String
    let confidence: String
    let usage: TokenUsage?
    let processingTime: String
    let requestId: String
}

struct TokenUsage: Codable {
    let promptTokens: Int
    let completionTokens: Int
    let totalTokens: Int
    
    enum CodingKeys: String, CodingKey {
        case promptTokens = "prompt_tokens"
        case completionTokens = "completion_tokens"
        case totalTokens = "total_tokens"
    }
}

struct ResponseMetadata: Codable {
    let timestamp: String
    let provider: String
    let requestId: String
    let processingTime: Int
    let imageSize: Int
    let mimeType: String
}

struct ErrorResponse: Codable {
    let success: Bool
    let error: APIErrorDetail
}

struct APIErrorDetail: Codable {
    let code: String
    let message: String
    let timestamp: String
}

enum APIError: Error {
    case invalidImage
    case invalidResponse
    case apiError(APIErrorDetail)
    
    var localizedDescription: String {
        switch self {
        case .invalidImage:
            return "Failed to process image"
        case .invalidResponse:
            return "Invalid server response"
        case .apiError(let detail):
            return detail.message
        }
    }
}
```

### Usage Example

```swift
class ViewController: UIViewController {
    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var captionLabel: UILabel!
    
    private let apiClient = CaptionAPIClient()
    
    @IBAction func generateCaptionTapped(_ sender: UIButton) {
        guard let image = imageView.image else { return }
        
        Task {
            do {
                let response = try await apiClient.generateCaption(for: image)
                
                await MainActor.run {
                    captionLabel.text = response.data.caption
                }
            } catch {
                await MainActor.run {
                    captionLabel.text = "Error: \(error.localizedDescription)"
                }
            }
        }
    }
}
```

### SwiftUI Implementation

```swift
import SwiftUI

struct CaptionView: View {
    @State private var selectedImage: UIImage?
    @State private var caption: String = ""
    @State private var isLoading = false
    @State private var showingImagePicker = false
    
    private let apiClient = CaptionAPIClient()
    
    var body: some View {
        VStack(spacing: 20) {
            if let image = selectedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 300)
                    .cornerRadius(10)
            } else {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 200)
                    .overlay(
                        Text("Tap to select image")
                            .foregroundColor(.gray)
                    )
            }
            
            Button("Select Image") {
                showingImagePicker = true
            }
            .buttonStyle(.borderedProminent)
            
            if !caption.isEmpty {
                Text(caption)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
            }
            
            if isLoading {
                ProgressView("Generating caption...")
            } else if selectedImage != nil {
                Button("Generate Caption") {
                    generateCaption()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker(selectedImage: $selectedImage)
        }
    }
    
    private func generateCaption() {
        guard let image = selectedImage else { return }
        
        isLoading = true
        
        Task {
            do {
                let response = try await apiClient.generateCaption(for: image)
                
                await MainActor.run {
                    caption = response.data.caption
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    caption = "Error: \(error.localizedDescription)"
                    isLoading = false
                }
            }
        }
    }
}

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var selectedImage: UIImage?
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.selectedImage = image
            }
            parent.dismiss()
        }
    }
}
```

## Image Optimization

### Best Practices

1. **Resize Images**: Compress to reasonable dimensions (max 1920x1080)
2. **Quality Settings**: Use 0.8 JPEG compression for good balance
3. **Format Support**: JPEG, PNG, WebP, HEIC are supported
4. **Size Limits**: Maximum 5MB after base64 encoding

### Swift Helper Extension

```swift
extension UIImage {
    func optimizedForAPI() -> UIImage? {
        let maxDimension: CGFloat = 1920
        let scale = min(maxDimension / size.width, maxDimension / size.height)
        
        if scale < 1.0 {
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)
            
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            draw(in: CGRect(origin: .zero, size: newSize))
            let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
            UIGraphicsEndImageContext()
            
            return resizedImage
        }
        
        return self
    }
}
```

## Testing

### cURL Examples

```bash
# Test with sample image
curl -X POST https://your-project.vercel.app/api/generateCaption \
  -H "Content-Type: application/json" \
  -H "X-App-Token: your-app-token" \
  -d '{
    "imageData": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "mimeType": "image/png"
  }'
```

### Unit Tests

```swift
import XCTest
@testable import YourApp

class CaptionAPITests: XCTestCase {
    var apiClient: CaptionAPIClient!
    
    override func setUp() {
        super.setUp()
        apiClient = CaptionAPIClient()
    }
    
    func testGenerateCaption() async throws {
        let testImage = UIImage(systemName: "photo")!
        let response = try await apiClient.generateCaption(for: testImage)
        
        XCTAssertTrue(response.success)
        XCTAssertFalse(response.data.caption.isEmpty)
    }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Limit**: 60 requests per minute per IP
- **Headers**: Rate limit information in response headers
- **Retry**: Implement exponential backoff for 429 responses

### Swift Retry Logic

```swift
func generateCaptionWithRetry(for image: UIImage, maxRetries: Int = 3) async throws -> CaptionResponse {
    var attempt = 0
    
    while attempt < maxRetries {
        do {
            return try await generateCaption(for: image)
        } catch APIError.apiError(let detail) where detail.code == "RATE_001" {
            attempt += 1
            if attempt >= maxRetries {
                throw APIError.apiError(detail)
            }
            
            let delay = pow(2.0, Double(attempt)) // Exponential backoff
            try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        }
    }
    
    throw APIError.invalidResponse
}
```

## Security Considerations

1. **Token Protection**: Store app tokens securely (Keychain on iOS)
2. **Image Privacy**: Images are not stored on server
3. **HTTPS Only**: All communication encrypted
4. **Input Validation**: All inputs validated server-side

## Support

For issues or questions:
1. Check error codes and solutions above
2. Review the troubleshooting section in README.md
3. Open an issue on GitHub with request/response details

## Changelog

### v1.0.0
- Initial release with OpenAI GPT-4 Vision support
- Basic authentication and validation
- Default caption generation