# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-18

### Added
- Initial stable release of the ChatGPT OAuth AI SDK provider
- Full support for gpt-5 models via ChatGPT OAuth
- Streaming support for text generation
- Tool calling capabilities with parallel execution
- Structured output generation (JSON mode)
- Reasoning effort control (low, medium, high)
- Complete OAuth implementation example with headless support
- Comprehensive documentation and examples
- Support for both Zod 3 and 4 with minimal validation

### Fixed
- Removed unsupported 'name' parameter from system messages
- Simplified tool examples for better compatibility

### Changed
- Reorganized documentation structure for clarity
- Enhanced JSON generation examples

## [1.0.0-beta.2] - 2025-08-13

### Added
- JSON generation examples and improved documentation
- OAuth implementation example with headless support

### Fixed
- Tool calling compatibility issues

## [1.0.0-beta.1] - 2025-08-12

### Added
- Initial beta implementation of ChatGPT OAuth AI SDK provider
- Basic text generation support
- Authentication handling via ChatGPT OAuth tokens

[1.0.0]: https://github.com/ben-vargas/ai-sdk-provider-chatgpt-oauth/releases/tag/v1.0.0
[1.0.0-beta.2]: https://github.com/ben-vargas/ai-sdk-provider-chatgpt-oauth/releases/tag/v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/ben-vargas/ai-sdk-provider-chatgpt-oauth/releases/tag/v1.0.0-beta.1