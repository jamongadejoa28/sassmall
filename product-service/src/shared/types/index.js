"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatus = exports.UserRole = exports.ErrorCode = exports.HTTP_STATUS = void 0;
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorCode["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    ErrorCode["NOT_FOUND_ERROR"] = "NOT_FOUND_ERROR";
    ErrorCode["CONFLICT_ERROR"] = "CONFLICT_ERROR";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["CUSTOMER"] = "customer";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["PAID"] = "paid";
    OrderStatus["SHIPPED"] = "shipped";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
//# sourceMappingURL=index.js.map