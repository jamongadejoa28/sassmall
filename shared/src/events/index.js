"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventFactory = exports.createEventConsumer = exports.createEventPublisher = exports.EventFactory = exports.EventConsumer = exports.EventPublisher = void 0;
__exportStar(require("./types"), exports);
const EventPublisher_1 = require("./EventPublisher");
Object.defineProperty(exports, "EventPublisher", { enumerable: true, get: function () { return EventPublisher_1.EventPublisher; } });
const EventConsumer_1 = require("./EventConsumer");
Object.defineProperty(exports, "EventConsumer", { enumerable: true, get: function () { return EventConsumer_1.EventConsumer; } });
const EventFactory_1 = require("./EventFactory");
Object.defineProperty(exports, "EventFactory", { enumerable: true, get: function () { return EventFactory_1.EventFactory; } });
const createEventPublisher = (kafkaBrokers, serviceName) => new EventPublisher_1.EventPublisher(kafkaBrokers, serviceName);
exports.createEventPublisher = createEventPublisher;
const createEventConsumer = (options, kafkaBrokers, serviceName) => new EventConsumer_1.EventConsumer(options, kafkaBrokers, serviceName);
exports.createEventConsumer = createEventConsumer;
const createEventFactory = (serviceName, version) => new EventFactory_1.EventFactory(serviceName, version);
exports.createEventFactory = createEventFactory;
//# sourceMappingURL=index.js.map