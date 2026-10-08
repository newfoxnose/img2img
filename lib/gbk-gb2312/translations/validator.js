/**
 * 翻译验证工具
 * 用于验证翻译文件的完整性和一致性
 */
/**
 * 获取所有必需的翻译键
 */
export function getAllRequiredKeys() {
    return [
        // Common keys
        'common.loading',
        'common.error',
        'common.success',
        'common.cancel',
        'common.confirm',
        'common.copy',
        'common.clear',
        'common.example',
        'common.expand',
        'common.collapse',
        'common.unknownType',
        // Page keys
        'page.title',
        'page.description',
        'page.subtitle',
        'page.features',
        // Input keys
        'input.title',
        'input.placeholder',
        'input.tips.title',
        'input.tips.items',
        // Output keys
        'output.title',
        'output.noData',
        'output.noDataDescription',
        'output.parsedCount',
        'output.copyJson',
        'output.copyValues',
        'output.supportedDataTypes',
        // Data type keys
        'dataTypes.string',
        'dataTypes.int',
        'dataTypes.float',
        'dataTypes.bool',
        'dataTypes.array',
        'dataTypes.object',
        'dataTypes.null',
        'dataTypes.resource',
        // Instructions keys
        'instructions.title',
        'instructions.steps',
        // Performance keys
        'performance.waiting',
        'performance.parsing',
        'performance.inputChars',
        'performance.parsedItems',
        'performance.processing',
        // Error keys
        'errors.parseFailed',
        'errors.invalidFormat',
        // Footer keys
        'footer.about.title',
        'footer.about.description',
        'footer.features.title',
        'footer.features.items',
        'footer.tech.title',
        'footer.tech.items',
        'footer.copyright',
        'footer.links.privacy',
        'footer.links.terms',
        'footer.links.contact'
    ];
}
/**
 * 获取数组类型的翻译键
 */
export function getArrayTranslationKeys() {
    return [
        'page.features',
        'input.tips.items',
        'instructions.steps',
        'footer.features.items',
        'footer.tech.items'
    ];
}
/**
 * 验证翻译对象
 */
export function validateTranslations(translations, language) {
    var requiredKeys = getAllRequiredKeys();
    var arrayKeys = getArrayTranslationKeys();
    var missingKeys = [];
    var extraKeys = [];
    var errors = [];
    // 检查缺失的键
    for (var _i = 0, requiredKeys_1 = requiredKeys; _i < requiredKeys_1.length; _i++) {
        var key = requiredKeys_1[_i];
        if (!hasNestedKey(translations, key)) {
            missingKeys.push(key);
        }
    }
    // 检查数组类型的键
    for (var _a = 0, arrayKeys_1 = arrayKeys; _a < arrayKeys_1.length; _a++) {
        var key = arrayKeys_1[_a];
        var value = getNestedValue(translations, key);
        if (value && !Array.isArray(value)) {
            errors.push("\u952E \"".concat(key, "\" \u5E94\u8BE5\u662F\u6570\u7EC4\u7C7B\u578B\uFF0C\u4F46\u5B9E\u9645\u662F ").concat(typeof value));
        }
    }
    // 检查字符串类型的键
    for (var _b = 0, requiredKeys_2 = requiredKeys; _b < requiredKeys_2.length; _b++) {
        var key = requiredKeys_2[_b];
        if (!arrayKeys.includes(key)) {
            var value = getNestedValue(translations, key);
            if (value && typeof value !== 'string') {
                errors.push("\u952E \"".concat(key, "\" \u5E94\u8BE5\u662F\u5B57\u7B26\u4E32\u7C7B\u578B\uFF0C\u4F46\u5B9E\u9645\u662F ").concat(typeof value));
            }
        }
    }
    // 查找额外的键（这里简化处理，只检查顶级键）
    var topLevelKeys = Object.keys(translations);
    var expectedTopLevelKeys = ['common', 'page', 'input', 'output', 'dataTypes', 'instructions', 'performance', 'errors', 'footer'];
    for (var _c = 0, topLevelKeys_1 = topLevelKeys; _c < topLevelKeys_1.length; _c++) {
        var key = topLevelKeys_1[_c];
        if (!expectedTopLevelKeys.includes(key)) {
            extraKeys.push(key);
        }
    }
    return {
        isValid: missingKeys.length === 0 && errors.length === 0,
        missingKeys: missingKeys,
        extraKeys: extraKeys,
        errors: errors
    };
}
/**
 * 检查嵌套键是否存在
 */
function hasNestedKey(obj, keyPath) {
    var keys = keyPath.split('.');
    var current = obj;
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        }
        else {
            return false;
        }
    }
    return true;
}
/**
 * 获取嵌套值
 */
function getNestedValue(obj, keyPath) {
    var keys = keyPath.split('.');
    var current = obj;
    for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
        var key = keys_2[_i];
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        }
        else {
            return undefined;
        }
    }
    return current;
}
/**
 * 验证所有语言的翻译一致性
 */
export function validateAllTranslations(allTranslations) {
    var results = {};
    for (var _i = 0, _a = Object.entries(allTranslations); _i < _a.length; _i++) {
        var _b = _a[_i], language = _b[0], translations = _b[1];
        results[language] = validateTranslations(translations, language);
    }
    return results;
}
/**
 * 生成翻译报告
 */
export function generateTranslationReport(validations) {
    var report = '# 翻译验证报告\n\n';
    for (var _i = 0, _a = Object.entries(validations); _i < _a.length; _i++) {
        var _b = _a[_i], language = _b[0], validation = _b[1];
        report += "## ".concat(language.toUpperCase(), "\n\n");
        if (validation.isValid) {
            report += '✅ 翻译完整且正确\n\n';
        }
        else {
            if (validation.missingKeys.length > 0) {
                report += "\u274C \u7F3A\u5931\u7684\u7FFB\u8BD1\u952E (".concat(validation.missingKeys.length, "):\n");
                validation.missingKeys.forEach(function (key) {
                    report += "- ".concat(key, "\n");
                });
                report += '\n';
            }
            if (validation.errors.length > 0) {
                report += "\u274C \u7FFB\u8BD1\u9519\u8BEF (".concat(validation.errors.length, "):\n");
                validation.errors.forEach(function (error) {
                    report += "- ".concat(error, "\n");
                });
                report += '\n';
            }
            if (validation.extraKeys.length > 0) {
                report += "\u26A0\uFE0F \u989D\u5916\u7684\u7FFB\u8BD1\u952E (".concat(validation.extraKeys.length, "):\n");
                validation.extraKeys.forEach(function (key) {
                    report += "- ".concat(key, "\n");
                });
                report += '\n';
            }
        }
    }
    return report;
}
