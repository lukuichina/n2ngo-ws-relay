/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $RangeError = $util.global.RangeError, $TypeError = $util.global.TypeError, $Boolean = $util.global.Boolean, $String = $util.global.String, $Array = $util.global.Array, $Number = $util.global.Number, $parseInt = $util.global.parseInt, $BigInt = $util.global.BigInt;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const n2n = $root.n2n = (() => {

    /**
     * Namespace n2n.
     * @exports n2n
     * @namespace
     */
    const n2n = {};

    n2n.SnPublicSecret = (function() {

        /**
         * Properties of a SnPublicSecret.
         * @typedef {Object} n2n.SnPublicSecret.$Properties
         * @property {boolean|null} [isRequest] SnPublicSecret isRequest
         * @property {Uint8Array|null} [pemData] SnPublicSecret pemData
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a SnPublicSecret.
         * @memberof n2n
         * @interface ISnPublicSecret
         * @augments n2n.SnPublicSecret.$Properties
         * @deprecated Use n2n.SnPublicSecret.$Properties instead.
         */

        /**
         * Shape of a SnPublicSecret.
         * @typedef {n2n.SnPublicSecret.$Properties} n2n.SnPublicSecret.$Shape
         */

        /**
         * Constructs a new SnPublicSecret.
         * @memberof n2n
         * @classdesc Represents a SnPublicSecret.
         * @constructor
         * @param {n2n.SnPublicSecret.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const SnPublicSecret = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * SnPublicSecret isRequest.
         * @member {boolean} isRequest
         * @memberof n2n.SnPublicSecret
         * @instance
         */
        SnPublicSecret.prototype.isRequest = false;

        /**
         * SnPublicSecret pemData.
         * @member {Uint8Array} pemData
         * @memberof n2n.SnPublicSecret
         * @instance
         */
        SnPublicSecret.prototype.pemData = $util.newBuffer([]);

        /**
         * Creates a new SnPublicSecret instance using the specified properties.
         * @function create
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {n2n.SnPublicSecret.$Properties=} [properties] Properties to set
         * @returns {n2n.SnPublicSecret} SnPublicSecret instance
         * @type {{
         *   (properties: n2n.SnPublicSecret.$Shape): n2n.SnPublicSecret & n2n.SnPublicSecret.$Shape;
         *   (properties?: n2n.SnPublicSecret.$Properties): n2n.SnPublicSecret;
         * }}
         */
        SnPublicSecret.create = function(properties) {
            return new SnPublicSecret(properties);
        };

        /**
         * Encodes the specified SnPublicSecret message. Does not implicitly {@link n2n.SnPublicSecret.verify|verify} messages.
         * @function encode
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {n2n.SnPublicSecret.$Properties} message SnPublicSecret message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SnPublicSecret.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.isRequest != null && $Object.hasOwnProperty.call(message, "isRequest") && message.isRequest !== false)
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.isRequest);
            if (message.pemData != null && $Object.hasOwnProperty.call(message, "pemData") && message.pemData.length)
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.pemData);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified SnPublicSecret message, length delimited. Does not implicitly {@link n2n.SnPublicSecret.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {n2n.SnPublicSecret.$Properties} message SnPublicSecret message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SnPublicSecret.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a SnPublicSecret message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.SnPublicSecret & n2n.SnPublicSecret.$Shape} SnPublicSecret
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SnPublicSecret.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.SnPublicSecret();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.isRequest = value;
                        else
                            delete message.isRequest;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.pemData = value;
                        else
                            delete message.pemData;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a SnPublicSecret message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.SnPublicSecret & n2n.SnPublicSecret.$Shape} SnPublicSecret
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SnPublicSecret.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SnPublicSecret message.
         * @function verify
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SnPublicSecret.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.isRequest != null && $Object.hasOwnProperty.call(message, "isRequest"))
                if (typeof message.isRequest !== "boolean")
                    return "isRequest: boolean expected";
            if (message.pemData != null && $Object.hasOwnProperty.call(message, "pemData"))
                if (!(message.pemData && typeof message.pemData.length === "number" || $util.isString(message.pemData)))
                    return "pemData: buffer expected";
            return null;
        };

        /**
         * Creates a SnPublicSecret message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.SnPublicSecret} SnPublicSecret
         */
        SnPublicSecret.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.SnPublicSecret)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.SnPublicSecret: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.SnPublicSecret();
            if (object.isRequest != null)
                if (object.isRequest)
                    message.isRequest = $Boolean(object.isRequest);
            if (object.pemData != null)
                if (object.pemData.length)
                    if (typeof object.pemData === "string")
                        $util.base64.decode(object.pemData, message.pemData = $util.newBuffer($util.base64.length(object.pemData)), 0);
                    else if (object.pemData.length >= 0)
                        message.pemData = object.pemData;
            return message;
        };

        /**
         * Creates a plain object from a SnPublicSecret message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {n2n.SnPublicSecret} message SnPublicSecret
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SnPublicSecret.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.isRequest = false;
                if (options.bytes === $String)
                    object.pemData = "";
                else {
                    object.pemData = [];
                    if (options.bytes !== $Array)
                        object.pemData = $util.newBuffer(object.pemData);
                }
            }
            if (message.isRequest != null && $Object.hasOwnProperty.call(message, "isRequest"))
                object.isRequest = message.isRequest;
            if (message.pemData != null && $Object.hasOwnProperty.call(message, "pemData"))
                object.pemData = options.bytes === $String ? $util.base64.encode(message.pemData, 0, message.pemData.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.pemData) : message.pemData;
            return object;
        };

        /**
         * Converts this SnPublicSecret to JSON.
         * @function toJSON
         * @memberof n2n.SnPublicSecret
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SnPublicSecret.prototype.toJSON = function() {
            return SnPublicSecret.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for SnPublicSecret
         * @function getTypeUrl
         * @memberof n2n.SnPublicSecret
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        SnPublicSecret.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.SnPublicSecret";
        };

        return SnPublicSecret;
    })();

    n2n.RegisterRequest = (function() {

        /**
         * Properties of a RegisterRequest.
         * @typedef {Object} n2n.RegisterRequest.$Properties
         * @property {string|null} [edgeMacAddr] RegisterRequest edgeMacAddr
         * @property {string|null} [edgeDesc] RegisterRequest edgeDesc
         * @property {string|null} [communityName] RegisterRequest communityName
         * @property {Uint8Array|null} [encryptedMachineId] RegisterRequest encryptedMachineId
         * @property {Uint8Array|null} [clearMachineId] RegisterRequest clearMachineId
         * @property {string|null} [p2pEndpoint] RegisterRequest p2pEndpoint
         * @property {Array.<string>|null} [p2pCapabilities] RegisterRequest p2pCapabilities
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a RegisterRequest.
         * @memberof n2n
         * @interface IRegisterRequest
         * @augments n2n.RegisterRequest.$Properties
         * @deprecated Use n2n.RegisterRequest.$Properties instead.
         */

        /**
         * Shape of a RegisterRequest.
         * @typedef {n2n.RegisterRequest.$Properties} n2n.RegisterRequest.$Shape
         */

        /**
         * Constructs a new RegisterRequest.
         * @memberof n2n
         * @classdesc Represents a RegisterRequest.
         * @constructor
         * @param {n2n.RegisterRequest.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const RegisterRequest = function (properties) {
            this.p2pCapabilities = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * RegisterRequest edgeMacAddr.
         * @member {string} edgeMacAddr
         * @memberof n2n.RegisterRequest
         * @instance
         */
        RegisterRequest.prototype.edgeMacAddr = "";

        /**
         * RegisterRequest edgeDesc.
         * @member {string} edgeDesc
         * @memberof n2n.RegisterRequest
         * @instance
         */
        RegisterRequest.prototype.edgeDesc = "";

        /**
         * RegisterRequest communityName.
         * @member {string} communityName
         * @memberof n2n.RegisterRequest
         * @instance
         */
        RegisterRequest.prototype.communityName = "";

        /**
         * RegisterRequest encryptedMachineId.
         * @member {Uint8Array} encryptedMachineId
         * @memberof n2n.RegisterRequest
         * @instance
         */
        RegisterRequest.prototype.encryptedMachineId = $util.newBuffer([]);

        /**
         * RegisterRequest clearMachineId.
         * @member {Uint8Array} clearMachineId
         * @memberof n2n.RegisterRequest
         * @instance
         */
        RegisterRequest.prototype.clearMachineId = $util.newBuffer([]);

        /**
         * RegisterRequest p2pEndpoint.
         * @member {string} p2pEndpoint
         * @memberof n2n.RegisterRequest
         * @instance
         */
        RegisterRequest.prototype.p2pEndpoint = "";

        /**
         * RegisterRequest p2pCapabilities.
         * @member {Array.<string>} p2pCapabilities
         * @memberof n2n.RegisterRequest
         * @instance
         */
        RegisterRequest.prototype.p2pCapabilities = $util.emptyArray;

        /**
         * Creates a new RegisterRequest instance using the specified properties.
         * @function create
         * @memberof n2n.RegisterRequest
         * @static
         * @param {n2n.RegisterRequest.$Properties=} [properties] Properties to set
         * @returns {n2n.RegisterRequest} RegisterRequest instance
         * @type {{
         *   (properties: n2n.RegisterRequest.$Shape): n2n.RegisterRequest & n2n.RegisterRequest.$Shape;
         *   (properties?: n2n.RegisterRequest.$Properties): n2n.RegisterRequest;
         * }}
         */
        RegisterRequest.create = function(properties) {
            return new RegisterRequest(properties);
        };

        /**
         * Encodes the specified RegisterRequest message. Does not implicitly {@link n2n.RegisterRequest.verify|verify} messages.
         * @function encode
         * @memberof n2n.RegisterRequest
         * @static
         * @param {n2n.RegisterRequest.$Properties} message RegisterRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterRequest.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.edgeMacAddr != null && $Object.hasOwnProperty.call(message, "edgeMacAddr") && message.edgeMacAddr !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.edgeMacAddr);
            if (message.edgeDesc != null && $Object.hasOwnProperty.call(message, "edgeDesc") && message.edgeDesc !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.edgeDesc);
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName") && message.communityName !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.communityName);
            if (message.encryptedMachineId != null && $Object.hasOwnProperty.call(message, "encryptedMachineId") && message.encryptedMachineId.length)
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.encryptedMachineId);
            if (message.clearMachineId != null && $Object.hasOwnProperty.call(message, "clearMachineId") && message.clearMachineId.length)
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.clearMachineId);
            if (message.p2pEndpoint != null && $Object.hasOwnProperty.call(message, "p2pEndpoint") && message.p2pEndpoint !== "")
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.p2pEndpoint);
            if (message.p2pCapabilities != null && message.p2pCapabilities.length)
                for (let i = 0; i < message.p2pCapabilities.length; ++i)
                    writer.uint32(/* id 7, wireType 2 =*/58).string(message.p2pCapabilities[i]);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified RegisterRequest message, length delimited. Does not implicitly {@link n2n.RegisterRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.RegisterRequest
         * @static
         * @param {n2n.RegisterRequest.$Properties} message RegisterRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterRequest.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a RegisterRequest message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.RegisterRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.RegisterRequest & n2n.RegisterRequest.$Shape} RegisterRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterRequest.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.RegisterRequest();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.edgeMacAddr = value;
                        else
                            delete message.edgeMacAddr;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.edgeDesc = value;
                        else
                            delete message.edgeDesc;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.communityName = value;
                        else
                            delete message.communityName;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.encryptedMachineId = value;
                        else
                            delete message.encryptedMachineId;
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.clearMachineId = value;
                        else
                            delete message.clearMachineId;
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.p2pEndpoint = value;
                        else
                            delete message.p2pEndpoint;
                        continue;
                    }
                case 7: {
                        if (wireType !== 2)
                            break;
                        if (!(message.p2pCapabilities && message.p2pCapabilities.length))
                            message.p2pCapabilities = [];
                        message.p2pCapabilities.push(reader.string());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a RegisterRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.RegisterRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.RegisterRequest & n2n.RegisterRequest.$Shape} RegisterRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterRequest.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RegisterRequest message.
         * @function verify
         * @memberof n2n.RegisterRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RegisterRequest.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.edgeMacAddr != null && $Object.hasOwnProperty.call(message, "edgeMacAddr"))
                if (!$util.isString(message.edgeMacAddr))
                    return "edgeMacAddr: string expected";
            if (message.edgeDesc != null && $Object.hasOwnProperty.call(message, "edgeDesc"))
                if (!$util.isString(message.edgeDesc))
                    return "edgeDesc: string expected";
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName"))
                if (!$util.isString(message.communityName))
                    return "communityName: string expected";
            if (message.encryptedMachineId != null && $Object.hasOwnProperty.call(message, "encryptedMachineId"))
                if (!(message.encryptedMachineId && typeof message.encryptedMachineId.length === "number" || $util.isString(message.encryptedMachineId)))
                    return "encryptedMachineId: buffer expected";
            if (message.clearMachineId != null && $Object.hasOwnProperty.call(message, "clearMachineId"))
                if (!(message.clearMachineId && typeof message.clearMachineId.length === "number" || $util.isString(message.clearMachineId)))
                    return "clearMachineId: buffer expected";
            if (message.p2pEndpoint != null && $Object.hasOwnProperty.call(message, "p2pEndpoint"))
                if (!$util.isString(message.p2pEndpoint))
                    return "p2pEndpoint: string expected";
            if (message.p2pCapabilities != null && $Object.hasOwnProperty.call(message, "p2pCapabilities")) {
                if (!$Array.isArray(message.p2pCapabilities))
                    return "p2pCapabilities: array expected";
                for (let i = 0; i < message.p2pCapabilities.length; ++i)
                    if (!$util.isString(message.p2pCapabilities[i]))
                        return "p2pCapabilities: string[] expected";
            }
            return null;
        };

        /**
         * Creates a RegisterRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.RegisterRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.RegisterRequest} RegisterRequest
         */
        RegisterRequest.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.RegisterRequest)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.RegisterRequest: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.RegisterRequest();
            if (object.edgeMacAddr != null)
                if (typeof object.edgeMacAddr !== "string" || object.edgeMacAddr.length)
                    message.edgeMacAddr = $String(object.edgeMacAddr);
            if (object.edgeDesc != null)
                if (typeof object.edgeDesc !== "string" || object.edgeDesc.length)
                    message.edgeDesc = $String(object.edgeDesc);
            if (object.communityName != null)
                if (typeof object.communityName !== "string" || object.communityName.length)
                    message.communityName = $String(object.communityName);
            if (object.encryptedMachineId != null)
                if (object.encryptedMachineId.length)
                    if (typeof object.encryptedMachineId === "string")
                        $util.base64.decode(object.encryptedMachineId, message.encryptedMachineId = $util.newBuffer($util.base64.length(object.encryptedMachineId)), 0);
                    else if (object.encryptedMachineId.length >= 0)
                        message.encryptedMachineId = object.encryptedMachineId;
            if (object.clearMachineId != null)
                if (object.clearMachineId.length)
                    if (typeof object.clearMachineId === "string")
                        $util.base64.decode(object.clearMachineId, message.clearMachineId = $util.newBuffer($util.base64.length(object.clearMachineId)), 0);
                    else if (object.clearMachineId.length >= 0)
                        message.clearMachineId = object.clearMachineId;
            if (object.p2pEndpoint != null)
                if (typeof object.p2pEndpoint !== "string" || object.p2pEndpoint.length)
                    message.p2pEndpoint = $String(object.p2pEndpoint);
            if (object.p2pCapabilities) {
                if (!$Array.isArray(object.p2pCapabilities))
                    throw $TypeError(".n2n.RegisterRequest.p2pCapabilities: array expected");
                message.p2pCapabilities = $Array(object.p2pCapabilities.length);
                for (let i = 0; i < object.p2pCapabilities.length; ++i)
                    message.p2pCapabilities[i] = $String(object.p2pCapabilities[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a RegisterRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.RegisterRequest
         * @static
         * @param {n2n.RegisterRequest} message RegisterRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RegisterRequest.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.p2pCapabilities = [];
            if (options.defaults) {
                object.edgeMacAddr = "";
                object.edgeDesc = "";
                object.communityName = "";
                if (options.bytes === $String)
                    object.encryptedMachineId = "";
                else {
                    object.encryptedMachineId = [];
                    if (options.bytes !== $Array)
                        object.encryptedMachineId = $util.newBuffer(object.encryptedMachineId);
                }
                if (options.bytes === $String)
                    object.clearMachineId = "";
                else {
                    object.clearMachineId = [];
                    if (options.bytes !== $Array)
                        object.clearMachineId = $util.newBuffer(object.clearMachineId);
                }
                object.p2pEndpoint = "";
            }
            if (message.edgeMacAddr != null && $Object.hasOwnProperty.call(message, "edgeMacAddr"))
                object.edgeMacAddr = message.edgeMacAddr;
            if (message.edgeDesc != null && $Object.hasOwnProperty.call(message, "edgeDesc"))
                object.edgeDesc = message.edgeDesc;
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName"))
                object.communityName = message.communityName;
            if (message.encryptedMachineId != null && $Object.hasOwnProperty.call(message, "encryptedMachineId"))
                object.encryptedMachineId = options.bytes === $String ? $util.base64.encode(message.encryptedMachineId, 0, message.encryptedMachineId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.encryptedMachineId) : message.encryptedMachineId;
            if (message.clearMachineId != null && $Object.hasOwnProperty.call(message, "clearMachineId"))
                object.clearMachineId = options.bytes === $String ? $util.base64.encode(message.clearMachineId, 0, message.clearMachineId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.clearMachineId) : message.clearMachineId;
            if (message.p2pEndpoint != null && $Object.hasOwnProperty.call(message, "p2pEndpoint"))
                object.p2pEndpoint = message.p2pEndpoint;
            if (message.p2pCapabilities && message.p2pCapabilities.length) {
                object.p2pCapabilities = $Array(message.p2pCapabilities.length);
                for (let j = 0; j < message.p2pCapabilities.length; ++j)
                    object.p2pCapabilities[j] = message.p2pCapabilities[j];
            }
            return object;
        };

        /**
         * Converts this RegisterRequest to JSON.
         * @function toJSON
         * @memberof n2n.RegisterRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RegisterRequest.prototype.toJSON = function() {
            return RegisterRequest.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for RegisterRequest
         * @function getTypeUrl
         * @memberof n2n.RegisterRequest
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        RegisterRequest.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.RegisterRequest";
        };

        return RegisterRequest;
    })();

    n2n.RegisterResponse = (function() {

        /**
         * Properties of a RegisterResponse.
         * @typedef {Object} n2n.RegisterResponse.$Properties
         * @property {boolean|null} [isRegisterOk] RegisterResponse isRegisterOk
         * @property {string|null} [virtualIp] RegisterResponse virtualIp
         * @property {number|null} [masklen] RegisterResponse masklen
         * @property {Uint8Array|null} [snPublicKey] RegisterResponse snPublicKey
         * @property {string|null} [communityName] RegisterResponse communityName
         * @property {string|null} [assignedMac] RegisterResponse assignedMac
         * @property {Array.<n2n.PeerInfo.$Properties>|null} [peers] RegisterResponse peers
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a RegisterResponse.
         * @memberof n2n
         * @interface IRegisterResponse
         * @augments n2n.RegisterResponse.$Properties
         * @deprecated Use n2n.RegisterResponse.$Properties instead.
         */

        /**
         * Shape of a RegisterResponse.
         * @typedef {n2n.RegisterResponse.$Properties} n2n.RegisterResponse.$Shape
         */

        /**
         * Constructs a new RegisterResponse.
         * @memberof n2n
         * @classdesc Represents a RegisterResponse.
         * @constructor
         * @param {n2n.RegisterResponse.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const RegisterResponse = function (properties) {
            this.peers = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * RegisterResponse isRegisterOk.
         * @member {boolean} isRegisterOk
         * @memberof n2n.RegisterResponse
         * @instance
         */
        RegisterResponse.prototype.isRegisterOk = false;

        /**
         * RegisterResponse virtualIp.
         * @member {string} virtualIp
         * @memberof n2n.RegisterResponse
         * @instance
         */
        RegisterResponse.prototype.virtualIp = "";

        /**
         * RegisterResponse masklen.
         * @member {number} masklen
         * @memberof n2n.RegisterResponse
         * @instance
         */
        RegisterResponse.prototype.masklen = 0;

        /**
         * RegisterResponse snPublicKey.
         * @member {Uint8Array} snPublicKey
         * @memberof n2n.RegisterResponse
         * @instance
         */
        RegisterResponse.prototype.snPublicKey = $util.newBuffer([]);

        /**
         * RegisterResponse communityName.
         * @member {string} communityName
         * @memberof n2n.RegisterResponse
         * @instance
         */
        RegisterResponse.prototype.communityName = "";

        /**
         * RegisterResponse assignedMac.
         * @member {string} assignedMac
         * @memberof n2n.RegisterResponse
         * @instance
         */
        RegisterResponse.prototype.assignedMac = "";

        /**
         * RegisterResponse peers.
         * @member {Array.<n2n.PeerInfo.$Properties>} peers
         * @memberof n2n.RegisterResponse
         * @instance
         */
        RegisterResponse.prototype.peers = $util.emptyArray;

        /**
         * Creates a new RegisterResponse instance using the specified properties.
         * @function create
         * @memberof n2n.RegisterResponse
         * @static
         * @param {n2n.RegisterResponse.$Properties=} [properties] Properties to set
         * @returns {n2n.RegisterResponse} RegisterResponse instance
         * @type {{
         *   (properties: n2n.RegisterResponse.$Shape): n2n.RegisterResponse & n2n.RegisterResponse.$Shape;
         *   (properties?: n2n.RegisterResponse.$Properties): n2n.RegisterResponse;
         * }}
         */
        RegisterResponse.create = function(properties) {
            return new RegisterResponse(properties);
        };

        /**
         * Encodes the specified RegisterResponse message. Does not implicitly {@link n2n.RegisterResponse.verify|verify} messages.
         * @function encode
         * @memberof n2n.RegisterResponse
         * @static
         * @param {n2n.RegisterResponse.$Properties} message RegisterResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterResponse.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.isRegisterOk != null && $Object.hasOwnProperty.call(message, "isRegisterOk") && message.isRegisterOk !== false)
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.isRegisterOk);
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp") && message.virtualIp !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.virtualIp);
            if (message.masklen != null && $Object.hasOwnProperty.call(message, "masklen") && message.masklen !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.masklen);
            if (message.snPublicKey != null && $Object.hasOwnProperty.call(message, "snPublicKey") && message.snPublicKey.length)
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.snPublicKey);
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName") && message.communityName !== "")
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.communityName);
            if (message.assignedMac != null && $Object.hasOwnProperty.call(message, "assignedMac") && message.assignedMac !== "")
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.assignedMac);
            if (message.peers != null && message.peers.length)
                for (let i = 0; i < message.peers.length; ++i)
                    $root.n2n.PeerInfo.encode(message.peers[i], writer.uint32(/* id 7, wireType 2 =*/58).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified RegisterResponse message, length delimited. Does not implicitly {@link n2n.RegisterResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.RegisterResponse
         * @static
         * @param {n2n.RegisterResponse.$Properties} message RegisterResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RegisterResponse.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a RegisterResponse message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.RegisterResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.RegisterResponse & n2n.RegisterResponse.$Shape} RegisterResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterResponse.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.RegisterResponse();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.isRegisterOk = value;
                        else
                            delete message.isRegisterOk;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.virtualIp = value;
                        else
                            delete message.virtualIp;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.int32())
                            message.masklen = value;
                        else
                            delete message.masklen;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.snPublicKey = value;
                        else
                            delete message.snPublicKey;
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.communityName = value;
                        else
                            delete message.communityName;
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.assignedMac = value;
                        else
                            delete message.assignedMac;
                        continue;
                    }
                case 7: {
                        if (wireType !== 2)
                            break;
                        if (!(message.peers && message.peers.length))
                            message.peers = [];
                        message.peers.push($root.n2n.PeerInfo.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a RegisterResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.RegisterResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.RegisterResponse & n2n.RegisterResponse.$Shape} RegisterResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RegisterResponse.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RegisterResponse message.
         * @function verify
         * @memberof n2n.RegisterResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RegisterResponse.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.isRegisterOk != null && $Object.hasOwnProperty.call(message, "isRegisterOk"))
                if (typeof message.isRegisterOk !== "boolean")
                    return "isRegisterOk: boolean expected";
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp"))
                if (!$util.isString(message.virtualIp))
                    return "virtualIp: string expected";
            if (message.masklen != null && $Object.hasOwnProperty.call(message, "masklen"))
                if (!$util.isInteger(message.masklen))
                    return "masklen: integer expected";
            if (message.snPublicKey != null && $Object.hasOwnProperty.call(message, "snPublicKey"))
                if (!(message.snPublicKey && typeof message.snPublicKey.length === "number" || $util.isString(message.snPublicKey)))
                    return "snPublicKey: buffer expected";
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName"))
                if (!$util.isString(message.communityName))
                    return "communityName: string expected";
            if (message.assignedMac != null && $Object.hasOwnProperty.call(message, "assignedMac"))
                if (!$util.isString(message.assignedMac))
                    return "assignedMac: string expected";
            if (message.peers != null && $Object.hasOwnProperty.call(message, "peers")) {
                if (!$Array.isArray(message.peers))
                    return "peers: array expected";
                for (let i = 0; i < message.peers.length; ++i) {
                    let error = $root.n2n.PeerInfo.verify(message.peers[i], _depth + 1);
                    if (error)
                        return "peers." + error;
                }
            }
            return null;
        };

        /**
         * Creates a RegisterResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.RegisterResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.RegisterResponse} RegisterResponse
         */
        RegisterResponse.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.RegisterResponse)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.RegisterResponse: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.RegisterResponse();
            if (object.isRegisterOk != null)
                if (object.isRegisterOk)
                    message.isRegisterOk = $Boolean(object.isRegisterOk);
            if (object.virtualIp != null)
                if (typeof object.virtualIp !== "string" || object.virtualIp.length)
                    message.virtualIp = $String(object.virtualIp);
            if (object.masklen != null)
                if ($Number(object.masklen) !== 0)
                    message.masklen = object.masklen | 0;
            if (object.snPublicKey != null)
                if (object.snPublicKey.length)
                    if (typeof object.snPublicKey === "string")
                        $util.base64.decode(object.snPublicKey, message.snPublicKey = $util.newBuffer($util.base64.length(object.snPublicKey)), 0);
                    else if (object.snPublicKey.length >= 0)
                        message.snPublicKey = object.snPublicKey;
            if (object.communityName != null)
                if (typeof object.communityName !== "string" || object.communityName.length)
                    message.communityName = $String(object.communityName);
            if (object.assignedMac != null)
                if (typeof object.assignedMac !== "string" || object.assignedMac.length)
                    message.assignedMac = $String(object.assignedMac);
            if (object.peers) {
                if (!$Array.isArray(object.peers))
                    throw $TypeError(".n2n.RegisterResponse.peers: array expected");
                message.peers = $Array(object.peers.length);
                for (let i = 0; i < object.peers.length; ++i) {
                    if (!$util.isObject(object.peers[i]))
                        throw $TypeError(".n2n.RegisterResponse.peers: object expected");
                    message.peers[i] = $root.n2n.PeerInfo.fromObject(object.peers[i], _depth + 1);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a RegisterResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.RegisterResponse
         * @static
         * @param {n2n.RegisterResponse} message RegisterResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RegisterResponse.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.peers = [];
            if (options.defaults) {
                object.isRegisterOk = false;
                object.virtualIp = "";
                object.masklen = 0;
                if (options.bytes === $String)
                    object.snPublicKey = "";
                else {
                    object.snPublicKey = [];
                    if (options.bytes !== $Array)
                        object.snPublicKey = $util.newBuffer(object.snPublicKey);
                }
                object.communityName = "";
                object.assignedMac = "";
            }
            if (message.isRegisterOk != null && $Object.hasOwnProperty.call(message, "isRegisterOk"))
                object.isRegisterOk = message.isRegisterOk;
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp"))
                object.virtualIp = message.virtualIp;
            if (message.masklen != null && $Object.hasOwnProperty.call(message, "masklen"))
                object.masklen = message.masklen;
            if (message.snPublicKey != null && $Object.hasOwnProperty.call(message, "snPublicKey"))
                object.snPublicKey = options.bytes === $String ? $util.base64.encode(message.snPublicKey, 0, message.snPublicKey.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.snPublicKey) : message.snPublicKey;
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName"))
                object.communityName = message.communityName;
            if (message.assignedMac != null && $Object.hasOwnProperty.call(message, "assignedMac"))
                object.assignedMac = message.assignedMac;
            if (message.peers && message.peers.length) {
                object.peers = $Array(message.peers.length);
                for (let j = 0; j < message.peers.length; ++j)
                    object.peers[j] = $root.n2n.PeerInfo.toObject(message.peers[j], options, _depth + 1);
            }
            return object;
        };

        /**
         * Converts this RegisterResponse to JSON.
         * @function toJSON
         * @memberof n2n.RegisterResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RegisterResponse.prototype.toJSON = function() {
            return RegisterResponse.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for RegisterResponse
         * @function getTypeUrl
         * @memberof n2n.RegisterResponse
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        RegisterResponse.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.RegisterResponse";
        };

        return RegisterResponse;
    })();

    n2n.PeerInfo = (function() {

        /**
         * Properties of a PeerInfo.
         * @typedef {Object} n2n.PeerInfo.$Properties
         * @property {string|null} [virtualIp] PeerInfo virtualIp
         * @property {Uint8Array|null} [macAddr] PeerInfo macAddr
         * @property {string|null} [pubSocket] PeerInfo pubSocket
         * @property {string|null} [community] PeerInfo community
         * @property {string|null} [desc] PeerInfo desc
         * @property {string|null} [p2pEndpoint] PeerInfo p2pEndpoint
         * @property {Array.<string>|null} [p2pCapabilities] PeerInfo p2pCapabilities
         * @property {string|null} [natType] PeerInfo natType
         * @property {number|Long|null} [lastSeen] PeerInfo lastSeen
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PeerInfo.
         * @memberof n2n
         * @interface IPeerInfo
         * @augments n2n.PeerInfo.$Properties
         * @deprecated Use n2n.PeerInfo.$Properties instead.
         */

        /**
         * Shape of a PeerInfo.
         * @typedef {n2n.PeerInfo.$Properties} n2n.PeerInfo.$Shape
         */

        /**
         * Constructs a new PeerInfo.
         * @memberof n2n
         * @classdesc Represents a PeerInfo.
         * @constructor
         * @param {n2n.PeerInfo.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PeerInfo = function (properties) {
            this.p2pCapabilities = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PeerInfo virtualIp.
         * @member {string} virtualIp
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.virtualIp = "";

        /**
         * PeerInfo macAddr.
         * @member {Uint8Array} macAddr
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.macAddr = $util.newBuffer([]);

        /**
         * PeerInfo pubSocket.
         * @member {string} pubSocket
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.pubSocket = "";

        /**
         * PeerInfo community.
         * @member {string} community
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.community = "";

        /**
         * PeerInfo desc.
         * @member {string} desc
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.desc = "";

        /**
         * PeerInfo p2pEndpoint.
         * @member {string} p2pEndpoint
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.p2pEndpoint = "";

        /**
         * PeerInfo p2pCapabilities.
         * @member {Array.<string>} p2pCapabilities
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.p2pCapabilities = $util.emptyArray;

        /**
         * PeerInfo natType.
         * @member {string} natType
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.natType = "";

        /**
         * PeerInfo lastSeen.
         * @member {number|Long} lastSeen
         * @memberof n2n.PeerInfo
         * @instance
         */
        PeerInfo.prototype.lastSeen = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Creates a new PeerInfo instance using the specified properties.
         * @function create
         * @memberof n2n.PeerInfo
         * @static
         * @param {n2n.PeerInfo.$Properties=} [properties] Properties to set
         * @returns {n2n.PeerInfo} PeerInfo instance
         * @type {{
         *   (properties: n2n.PeerInfo.$Shape): n2n.PeerInfo & n2n.PeerInfo.$Shape;
         *   (properties?: n2n.PeerInfo.$Properties): n2n.PeerInfo;
         * }}
         */
        PeerInfo.create = function(properties) {
            return new PeerInfo(properties);
        };

        /**
         * Encodes the specified PeerInfo message. Does not implicitly {@link n2n.PeerInfo.verify|verify} messages.
         * @function encode
         * @memberof n2n.PeerInfo
         * @static
         * @param {n2n.PeerInfo.$Properties} message PeerInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfo.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp") && message.virtualIp !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.virtualIp);
            if (message.macAddr != null && $Object.hasOwnProperty.call(message, "macAddr") && message.macAddr.length)
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.macAddr);
            if (message.pubSocket != null && $Object.hasOwnProperty.call(message, "pubSocket") && message.pubSocket !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.pubSocket);
            if (message.community != null && $Object.hasOwnProperty.call(message, "community") && message.community !== "")
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.community);
            if (message.desc != null && $Object.hasOwnProperty.call(message, "desc") && message.desc !== "")
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.desc);
            if (message.p2pEndpoint != null && $Object.hasOwnProperty.call(message, "p2pEndpoint") && message.p2pEndpoint !== "")
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.p2pEndpoint);
            if (message.p2pCapabilities != null && message.p2pCapabilities.length)
                for (let i = 0; i < message.p2pCapabilities.length; ++i)
                    writer.uint32(/* id 7, wireType 2 =*/58).string(message.p2pCapabilities[i]);
            if (message.natType != null && $Object.hasOwnProperty.call(message, "natType") && message.natType !== "")
                writer.uint32(/* id 8, wireType 2 =*/66).string(message.natType);
            if (message.lastSeen != null && $Object.hasOwnProperty.call(message, "lastSeen") && (typeof message.lastSeen === "object" ? message.lastSeen.low || message.lastSeen.high : message.lastSeen !== 0))
                writer.uint32(/* id 9, wireType 0 =*/72).uint64(message.lastSeen);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PeerInfo message, length delimited. Does not implicitly {@link n2n.PeerInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.PeerInfo
         * @static
         * @param {n2n.PeerInfo.$Properties} message PeerInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfo.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a PeerInfo message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.PeerInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.PeerInfo & n2n.PeerInfo.$Shape} PeerInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfo.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.PeerInfo();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.virtualIp = value;
                        else
                            delete message.virtualIp;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.macAddr = value;
                        else
                            delete message.macAddr;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.pubSocket = value;
                        else
                            delete message.pubSocket;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.community = value;
                        else
                            delete message.community;
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.desc = value;
                        else
                            delete message.desc;
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.p2pEndpoint = value;
                        else
                            delete message.p2pEndpoint;
                        continue;
                    }
                case 7: {
                        if (wireType !== 2)
                            break;
                        if (!(message.p2pCapabilities && message.p2pCapabilities.length))
                            message.p2pCapabilities = [];
                        message.p2pCapabilities.push(reader.string());
                        continue;
                    }
                case 8: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.natType = value;
                        else
                            delete message.natType;
                        continue;
                    }
                case 9: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                            message.lastSeen = value;
                        else
                            delete message.lastSeen;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PeerInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.PeerInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.PeerInfo & n2n.PeerInfo.$Shape} PeerInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfo.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PeerInfo message.
         * @function verify
         * @memberof n2n.PeerInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PeerInfo.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp"))
                if (!$util.isString(message.virtualIp))
                    return "virtualIp: string expected";
            if (message.macAddr != null && $Object.hasOwnProperty.call(message, "macAddr"))
                if (!(message.macAddr && typeof message.macAddr.length === "number" || $util.isString(message.macAddr)))
                    return "macAddr: buffer expected";
            if (message.pubSocket != null && $Object.hasOwnProperty.call(message, "pubSocket"))
                if (!$util.isString(message.pubSocket))
                    return "pubSocket: string expected";
            if (message.community != null && $Object.hasOwnProperty.call(message, "community"))
                if (!$util.isString(message.community))
                    return "community: string expected";
            if (message.desc != null && $Object.hasOwnProperty.call(message, "desc"))
                if (!$util.isString(message.desc))
                    return "desc: string expected";
            if (message.p2pEndpoint != null && $Object.hasOwnProperty.call(message, "p2pEndpoint"))
                if (!$util.isString(message.p2pEndpoint))
                    return "p2pEndpoint: string expected";
            if (message.p2pCapabilities != null && $Object.hasOwnProperty.call(message, "p2pCapabilities")) {
                if (!$Array.isArray(message.p2pCapabilities))
                    return "p2pCapabilities: array expected";
                for (let i = 0; i < message.p2pCapabilities.length; ++i)
                    if (!$util.isString(message.p2pCapabilities[i]))
                        return "p2pCapabilities: string[] expected";
            }
            if (message.natType != null && $Object.hasOwnProperty.call(message, "natType"))
                if (!$util.isString(message.natType))
                    return "natType: string expected";
            if (message.lastSeen != null && $Object.hasOwnProperty.call(message, "lastSeen"))
                if (!$util.isInteger(message.lastSeen) && !(message.lastSeen && $util.isInteger(message.lastSeen.low) && $util.isInteger(message.lastSeen.high)))
                    return "lastSeen: integer|Long expected";
            return null;
        };

        /**
         * Creates a PeerInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.PeerInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.PeerInfo} PeerInfo
         */
        PeerInfo.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.PeerInfo)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.PeerInfo: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.PeerInfo();
            if (object.virtualIp != null)
                if (typeof object.virtualIp !== "string" || object.virtualIp.length)
                    message.virtualIp = $String(object.virtualIp);
            if (object.macAddr != null)
                if (object.macAddr.length)
                    if (typeof object.macAddr === "string")
                        $util.base64.decode(object.macAddr, message.macAddr = $util.newBuffer($util.base64.length(object.macAddr)), 0);
                    else if (object.macAddr.length >= 0)
                        message.macAddr = object.macAddr;
            if (object.pubSocket != null)
                if (typeof object.pubSocket !== "string" || object.pubSocket.length)
                    message.pubSocket = $String(object.pubSocket);
            if (object.community != null)
                if (typeof object.community !== "string" || object.community.length)
                    message.community = $String(object.community);
            if (object.desc != null)
                if (typeof object.desc !== "string" || object.desc.length)
                    message.desc = $String(object.desc);
            if (object.p2pEndpoint != null)
                if (typeof object.p2pEndpoint !== "string" || object.p2pEndpoint.length)
                    message.p2pEndpoint = $String(object.p2pEndpoint);
            if (object.p2pCapabilities) {
                if (!$Array.isArray(object.p2pCapabilities))
                    throw $TypeError(".n2n.PeerInfo.p2pCapabilities: array expected");
                message.p2pCapabilities = $Array(object.p2pCapabilities.length);
                for (let i = 0; i < object.p2pCapabilities.length; ++i)
                    message.p2pCapabilities[i] = $String(object.p2pCapabilities[i]);
            }
            if (object.natType != null)
                if (typeof object.natType !== "string" || object.natType.length)
                    message.natType = $String(object.natType);
            if (object.lastSeen != null)
                if (typeof object.lastSeen === "object" ? object.lastSeen.low || object.lastSeen.high : $Number(object.lastSeen) !== 0)
                    if ($util.Long)
                        message.lastSeen = $util.Long.fromValue(object.lastSeen, true);
                    else if (typeof object.lastSeen === "string")
                        message.lastSeen = $parseInt(object.lastSeen, 10);
                    else if (typeof object.lastSeen === "number")
                        message.lastSeen = object.lastSeen;
                    else if (typeof object.lastSeen === "object")
                        message.lastSeen = new $util.LongBits(object.lastSeen.low >>> 0, object.lastSeen.high >>> 0).toNumber(true);
            return message;
        };

        /**
         * Creates a plain object from a PeerInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.PeerInfo
         * @static
         * @param {n2n.PeerInfo} message PeerInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PeerInfo.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.p2pCapabilities = [];
            if (options.defaults) {
                object.virtualIp = "";
                if (options.bytes === $String)
                    object.macAddr = "";
                else {
                    object.macAddr = [];
                    if (options.bytes !== $Array)
                        object.macAddr = $util.newBuffer(object.macAddr);
                }
                object.pubSocket = "";
                object.community = "";
                object.desc = "";
                object.p2pEndpoint = "";
                object.natType = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.lastSeen = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.lastSeen = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            }
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp"))
                object.virtualIp = message.virtualIp;
            if (message.macAddr != null && $Object.hasOwnProperty.call(message, "macAddr"))
                object.macAddr = options.bytes === $String ? $util.base64.encode(message.macAddr, 0, message.macAddr.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.macAddr) : message.macAddr;
            if (message.pubSocket != null && $Object.hasOwnProperty.call(message, "pubSocket"))
                object.pubSocket = message.pubSocket;
            if (message.community != null && $Object.hasOwnProperty.call(message, "community"))
                object.community = message.community;
            if (message.desc != null && $Object.hasOwnProperty.call(message, "desc"))
                object.desc = message.desc;
            if (message.p2pEndpoint != null && $Object.hasOwnProperty.call(message, "p2pEndpoint"))
                object.p2pEndpoint = message.p2pEndpoint;
            if (message.p2pCapabilities && message.p2pCapabilities.length) {
                object.p2pCapabilities = $Array(message.p2pCapabilities.length);
                for (let j = 0; j < message.p2pCapabilities.length; ++j)
                    object.p2pCapabilities[j] = message.p2pCapabilities[j];
            }
            if (message.natType != null && $Object.hasOwnProperty.call(message, "natType"))
                object.natType = message.natType;
            if (message.lastSeen != null && $Object.hasOwnProperty.call(message, "lastSeen"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.lastSeen = typeof message.lastSeen === "number" ? $BigInt(message.lastSeen) : $util.Long.fromBits(message.lastSeen.low >>> 0, message.lastSeen.high >>> 0, true).toBigInt();
                else if (typeof message.lastSeen === "number")
                    object.lastSeen = options.longs === $String ? $String(message.lastSeen) : message.lastSeen;
                else
                    object.lastSeen = options.longs === $String ? $util.Long.prototype.toString.call(message.lastSeen) : options.longs === $Number ? new $util.LongBits(message.lastSeen.low >>> 0, message.lastSeen.high >>> 0).toNumber(true) : message.lastSeen;
            return object;
        };

        /**
         * Converts this PeerInfo to JSON.
         * @function toJSON
         * @memberof n2n.PeerInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PeerInfo.prototype.toJSON = function() {
            return PeerInfo.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PeerInfo
         * @function getTypeUrl
         * @memberof n2n.PeerInfo
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PeerInfo.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.PeerInfo";
        };

        return PeerInfo;
    })();

    n2n.PeerInfoList = (function() {

        /**
         * Properties of a PeerInfoList.
         * @typedef {Object} n2n.PeerInfoList.$Properties
         * @property {boolean|null} [hasOrigin] PeerInfoList hasOrigin
         * @property {n2n.PeerInfo.$Properties|null} [origin] PeerInfoList origin
         * @property {Array.<n2n.PeerInfo.$Properties>|null} [peerInfos] PeerInfoList peerInfos
         * @property {number|null} [eventType] PeerInfoList eventType
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PeerInfoList.
         * @memberof n2n
         * @interface IPeerInfoList
         * @augments n2n.PeerInfoList.$Properties
         * @deprecated Use n2n.PeerInfoList.$Properties instead.
         */

        /**
         * Shape of a PeerInfoList.
         * @typedef {n2n.PeerInfoList.$Properties} n2n.PeerInfoList.$Shape
         */

        /**
         * Constructs a new PeerInfoList.
         * @memberof n2n
         * @classdesc Represents a PeerInfoList.
         * @constructor
         * @param {n2n.PeerInfoList.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PeerInfoList = function (properties) {
            this.peerInfos = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PeerInfoList hasOrigin.
         * @member {boolean} hasOrigin
         * @memberof n2n.PeerInfoList
         * @instance
         */
        PeerInfoList.prototype.hasOrigin = false;

        /**
         * PeerInfoList origin.
         * @member {n2n.PeerInfo.$Properties|null|undefined} origin
         * @memberof n2n.PeerInfoList
         * @instance
         */
        PeerInfoList.prototype.origin = null;

        /**
         * PeerInfoList peerInfos.
         * @member {Array.<n2n.PeerInfo.$Properties>} peerInfos
         * @memberof n2n.PeerInfoList
         * @instance
         */
        PeerInfoList.prototype.peerInfos = $util.emptyArray;

        /**
         * PeerInfoList eventType.
         * @member {number} eventType
         * @memberof n2n.PeerInfoList
         * @instance
         */
        PeerInfoList.prototype.eventType = 0;

        /**
         * Creates a new PeerInfoList instance using the specified properties.
         * @function create
         * @memberof n2n.PeerInfoList
         * @static
         * @param {n2n.PeerInfoList.$Properties=} [properties] Properties to set
         * @returns {n2n.PeerInfoList} PeerInfoList instance
         * @type {{
         *   (properties: n2n.PeerInfoList.$Shape): n2n.PeerInfoList & n2n.PeerInfoList.$Shape;
         *   (properties?: n2n.PeerInfoList.$Properties): n2n.PeerInfoList;
         * }}
         */
        PeerInfoList.create = function(properties) {
            return new PeerInfoList(properties);
        };

        /**
         * Encodes the specified PeerInfoList message. Does not implicitly {@link n2n.PeerInfoList.verify|verify} messages.
         * @function encode
         * @memberof n2n.PeerInfoList
         * @static
         * @param {n2n.PeerInfoList.$Properties} message PeerInfoList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoList.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.hasOrigin != null && $Object.hasOwnProperty.call(message, "hasOrigin") && message.hasOrigin !== false)
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.hasOrigin);
            if (message.origin != null && $Object.hasOwnProperty.call(message, "origin"))
                $root.n2n.PeerInfo.encode(message.origin, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.peerInfos != null && message.peerInfos.length)
                for (let i = 0; i < message.peerInfos.length; ++i)
                    $root.n2n.PeerInfo.encode(message.peerInfos[i], writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.eventType != null && $Object.hasOwnProperty.call(message, "eventType") && message.eventType !== 0)
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.eventType);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PeerInfoList message, length delimited. Does not implicitly {@link n2n.PeerInfoList.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.PeerInfoList
         * @static
         * @param {n2n.PeerInfoList.$Properties} message PeerInfoList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PeerInfoList.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a PeerInfoList message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.PeerInfoList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.PeerInfoList & n2n.PeerInfoList.$Shape} PeerInfoList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoList.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.PeerInfoList();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.hasOrigin = value;
                        else
                            delete message.hasOrigin;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.origin = $root.n2n.PeerInfo.decode(reader, reader.uint32(), $undefined, _depth + 1, message.origin);
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if (!(message.peerInfos && message.peerInfos.length))
                            message.peerInfos = [];
                        message.peerInfos.push($root.n2n.PeerInfo.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                case 4: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.eventType = value;
                        else
                            delete message.eventType;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PeerInfoList message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.PeerInfoList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.PeerInfoList & n2n.PeerInfoList.$Shape} PeerInfoList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PeerInfoList.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PeerInfoList message.
         * @function verify
         * @memberof n2n.PeerInfoList
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PeerInfoList.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.hasOrigin != null && $Object.hasOwnProperty.call(message, "hasOrigin"))
                if (typeof message.hasOrigin !== "boolean")
                    return "hasOrigin: boolean expected";
            if (message.origin != null && $Object.hasOwnProperty.call(message, "origin")) {
                let error = $root.n2n.PeerInfo.verify(message.origin, _depth + 1);
                if (error)
                    return "origin." + error;
            }
            if (message.peerInfos != null && $Object.hasOwnProperty.call(message, "peerInfos")) {
                if (!$Array.isArray(message.peerInfos))
                    return "peerInfos: array expected";
                for (let i = 0; i < message.peerInfos.length; ++i) {
                    let error = $root.n2n.PeerInfo.verify(message.peerInfos[i], _depth + 1);
                    if (error)
                        return "peerInfos." + error;
                }
            }
            if (message.eventType != null && $Object.hasOwnProperty.call(message, "eventType"))
                if (!$util.isInteger(message.eventType))
                    return "eventType: integer expected";
            return null;
        };

        /**
         * Creates a PeerInfoList message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.PeerInfoList
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.PeerInfoList} PeerInfoList
         */
        PeerInfoList.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.PeerInfoList)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.PeerInfoList: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.PeerInfoList();
            if (object.hasOrigin != null)
                if (object.hasOrigin)
                    message.hasOrigin = $Boolean(object.hasOrigin);
            if (object.origin != null) {
                if (!$util.isObject(object.origin))
                    throw $TypeError(".n2n.PeerInfoList.origin: object expected");
                message.origin = $root.n2n.PeerInfo.fromObject(object.origin, _depth + 1);
            }
            if (object.peerInfos) {
                if (!$Array.isArray(object.peerInfos))
                    throw $TypeError(".n2n.PeerInfoList.peerInfos: array expected");
                message.peerInfos = $Array(object.peerInfos.length);
                for (let i = 0; i < object.peerInfos.length; ++i) {
                    if (!$util.isObject(object.peerInfos[i]))
                        throw $TypeError(".n2n.PeerInfoList.peerInfos: object expected");
                    message.peerInfos[i] = $root.n2n.PeerInfo.fromObject(object.peerInfos[i], _depth + 1);
                }
            }
            if (object.eventType != null)
                if ($Number(object.eventType) !== 0)
                    message.eventType = object.eventType >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a PeerInfoList message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.PeerInfoList
         * @static
         * @param {n2n.PeerInfoList} message PeerInfoList
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PeerInfoList.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.peerInfos = [];
            if (options.defaults) {
                object.hasOrigin = false;
                object.origin = null;
                object.eventType = 0;
            }
            if (message.hasOrigin != null && $Object.hasOwnProperty.call(message, "hasOrigin"))
                object.hasOrigin = message.hasOrigin;
            if (message.origin != null && $Object.hasOwnProperty.call(message, "origin"))
                object.origin = $root.n2n.PeerInfo.toObject(message.origin, options, _depth + 1);
            if (message.peerInfos && message.peerInfos.length) {
                object.peerInfos = $Array(message.peerInfos.length);
                for (let j = 0; j < message.peerInfos.length; ++j)
                    object.peerInfos[j] = $root.n2n.PeerInfo.toObject(message.peerInfos[j], options, _depth + 1);
            }
            if (message.eventType != null && $Object.hasOwnProperty.call(message, "eventType"))
                object.eventType = message.eventType;
            return object;
        };

        /**
         * Converts this PeerInfoList to JSON.
         * @function toJSON
         * @memberof n2n.PeerInfoList
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PeerInfoList.prototype.toJSON = function() {
            return PeerInfoList.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PeerInfoList
         * @function getTypeUrl
         * @memberof n2n.PeerInfoList
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PeerInfoList.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.PeerInfoList";
        };

        return PeerInfoList;
    })();

    n2n.ICECandidate = (function() {

        /**
         * Properties of a ICECandidate.
         * @typedef {Object} n2n.ICECandidate.$Properties
         * @property {string|null} [targetMac] ICECandidate targetMac
         * @property {string|null} [candidate] ICECandidate candidate
         * @property {string|null} [sdpMid] ICECandidate sdpMid
         * @property {number|null} [sdpMlineIndex] ICECandidate sdpMlineIndex
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ICECandidate.
         * @memberof n2n
         * @interface IICECandidate
         * @augments n2n.ICECandidate.$Properties
         * @deprecated Use n2n.ICECandidate.$Properties instead.
         */

        /**
         * Shape of a ICECandidate.
         * @typedef {n2n.ICECandidate.$Properties} n2n.ICECandidate.$Shape
         */

        /**
         * Constructs a new ICECandidate.
         * @memberof n2n
         * @classdesc Represents a ICECandidate.
         * @constructor
         * @param {n2n.ICECandidate.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ICECandidate = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ICECandidate targetMac.
         * @member {string} targetMac
         * @memberof n2n.ICECandidate
         * @instance
         */
        ICECandidate.prototype.targetMac = "";

        /**
         * ICECandidate candidate.
         * @member {string} candidate
         * @memberof n2n.ICECandidate
         * @instance
         */
        ICECandidate.prototype.candidate = "";

        /**
         * ICECandidate sdpMid.
         * @member {string} sdpMid
         * @memberof n2n.ICECandidate
         * @instance
         */
        ICECandidate.prototype.sdpMid = "";

        /**
         * ICECandidate sdpMlineIndex.
         * @member {number} sdpMlineIndex
         * @memberof n2n.ICECandidate
         * @instance
         */
        ICECandidate.prototype.sdpMlineIndex = 0;

        /**
         * Creates a new ICECandidate instance using the specified properties.
         * @function create
         * @memberof n2n.ICECandidate
         * @static
         * @param {n2n.ICECandidate.$Properties=} [properties] Properties to set
         * @returns {n2n.ICECandidate} ICECandidate instance
         * @type {{
         *   (properties: n2n.ICECandidate.$Shape): n2n.ICECandidate & n2n.ICECandidate.$Shape;
         *   (properties?: n2n.ICECandidate.$Properties): n2n.ICECandidate;
         * }}
         */
        ICECandidate.create = function(properties) {
            return new ICECandidate(properties);
        };

        /**
         * Encodes the specified ICECandidate message. Does not implicitly {@link n2n.ICECandidate.verify|verify} messages.
         * @function encode
         * @memberof n2n.ICECandidate
         * @static
         * @param {n2n.ICECandidate.$Properties} message ICECandidate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ICECandidate.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.targetMac != null && $Object.hasOwnProperty.call(message, "targetMac") && message.targetMac !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.targetMac);
            if (message.candidate != null && $Object.hasOwnProperty.call(message, "candidate") && message.candidate !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.candidate);
            if (message.sdpMid != null && $Object.hasOwnProperty.call(message, "sdpMid") && message.sdpMid !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.sdpMid);
            if (message.sdpMlineIndex != null && $Object.hasOwnProperty.call(message, "sdpMlineIndex") && message.sdpMlineIndex !== 0)
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.sdpMlineIndex);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ICECandidate message, length delimited. Does not implicitly {@link n2n.ICECandidate.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.ICECandidate
         * @static
         * @param {n2n.ICECandidate.$Properties} message ICECandidate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ICECandidate.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ICECandidate message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.ICECandidate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.ICECandidate & n2n.ICECandidate.$Shape} ICECandidate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ICECandidate.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.ICECandidate();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.targetMac = value;
                        else
                            delete message.targetMac;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.candidate = value;
                        else
                            delete message.candidate;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.sdpMid = value;
                        else
                            delete message.sdpMid;
                        continue;
                    }
                case 4: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.sdpMlineIndex = value;
                        else
                            delete message.sdpMlineIndex;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ICECandidate message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.ICECandidate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.ICECandidate & n2n.ICECandidate.$Shape} ICECandidate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ICECandidate.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ICECandidate message.
         * @function verify
         * @memberof n2n.ICECandidate
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ICECandidate.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.targetMac != null && $Object.hasOwnProperty.call(message, "targetMac"))
                if (!$util.isString(message.targetMac))
                    return "targetMac: string expected";
            if (message.candidate != null && $Object.hasOwnProperty.call(message, "candidate"))
                if (!$util.isString(message.candidate))
                    return "candidate: string expected";
            if (message.sdpMid != null && $Object.hasOwnProperty.call(message, "sdpMid"))
                if (!$util.isString(message.sdpMid))
                    return "sdpMid: string expected";
            if (message.sdpMlineIndex != null && $Object.hasOwnProperty.call(message, "sdpMlineIndex"))
                if (!$util.isInteger(message.sdpMlineIndex))
                    return "sdpMlineIndex: integer expected";
            return null;
        };

        /**
         * Creates a ICECandidate message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.ICECandidate
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.ICECandidate} ICECandidate
         */
        ICECandidate.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.ICECandidate)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.ICECandidate: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.ICECandidate();
            if (object.targetMac != null)
                if (typeof object.targetMac !== "string" || object.targetMac.length)
                    message.targetMac = $String(object.targetMac);
            if (object.candidate != null)
                if (typeof object.candidate !== "string" || object.candidate.length)
                    message.candidate = $String(object.candidate);
            if (object.sdpMid != null)
                if (typeof object.sdpMid !== "string" || object.sdpMid.length)
                    message.sdpMid = $String(object.sdpMid);
            if (object.sdpMlineIndex != null)
                if ($Number(object.sdpMlineIndex) !== 0)
                    message.sdpMlineIndex = object.sdpMlineIndex >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a ICECandidate message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.ICECandidate
         * @static
         * @param {n2n.ICECandidate} message ICECandidate
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ICECandidate.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.targetMac = "";
                object.candidate = "";
                object.sdpMid = "";
                object.sdpMlineIndex = 0;
            }
            if (message.targetMac != null && $Object.hasOwnProperty.call(message, "targetMac"))
                object.targetMac = message.targetMac;
            if (message.candidate != null && $Object.hasOwnProperty.call(message, "candidate"))
                object.candidate = message.candidate;
            if (message.sdpMid != null && $Object.hasOwnProperty.call(message, "sdpMid"))
                object.sdpMid = message.sdpMid;
            if (message.sdpMlineIndex != null && $Object.hasOwnProperty.call(message, "sdpMlineIndex"))
                object.sdpMlineIndex = message.sdpMlineIndex;
            return object;
        };

        /**
         * Converts this ICECandidate to JSON.
         * @function toJSON
         * @memberof n2n.ICECandidate
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ICECandidate.prototype.toJSON = function() {
            return ICECandidate.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ICECandidate
         * @function getTypeUrl
         * @memberof n2n.ICECandidate
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ICECandidate.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.ICECandidate";
        };

        return ICECandidate;
    })();

    n2n.TURNCredentials = (function() {

        /**
         * Properties of a TURNCredentials.
         * @typedef {Object} n2n.TURNCredentials.$Properties
         * @property {string|null} [username] TURNCredentials username
         * @property {string|null} [password] TURNCredentials password
         * @property {number|null} [ttl] TURNCredentials ttl
         * @property {Array.<string>|null} [uris] TURNCredentials uris
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TURNCredentials.
         * @memberof n2n
         * @interface ITURNCredentials
         * @augments n2n.TURNCredentials.$Properties
         * @deprecated Use n2n.TURNCredentials.$Properties instead.
         */

        /**
         * Shape of a TURNCredentials.
         * @typedef {n2n.TURNCredentials.$Properties} n2n.TURNCredentials.$Shape
         */

        /**
         * Constructs a new TURNCredentials.
         * @memberof n2n
         * @classdesc Represents a TURNCredentials.
         * @constructor
         * @param {n2n.TURNCredentials.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TURNCredentials = function (properties) {
            this.uris = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TURNCredentials username.
         * @member {string} username
         * @memberof n2n.TURNCredentials
         * @instance
         */
        TURNCredentials.prototype.username = "";

        /**
         * TURNCredentials password.
         * @member {string} password
         * @memberof n2n.TURNCredentials
         * @instance
         */
        TURNCredentials.prototype.password = "";

        /**
         * TURNCredentials ttl.
         * @member {number} ttl
         * @memberof n2n.TURNCredentials
         * @instance
         */
        TURNCredentials.prototype.ttl = 0;

        /**
         * TURNCredentials uris.
         * @member {Array.<string>} uris
         * @memberof n2n.TURNCredentials
         * @instance
         */
        TURNCredentials.prototype.uris = $util.emptyArray;

        /**
         * Creates a new TURNCredentials instance using the specified properties.
         * @function create
         * @memberof n2n.TURNCredentials
         * @static
         * @param {n2n.TURNCredentials.$Properties=} [properties] Properties to set
         * @returns {n2n.TURNCredentials} TURNCredentials instance
         * @type {{
         *   (properties: n2n.TURNCredentials.$Shape): n2n.TURNCredentials & n2n.TURNCredentials.$Shape;
         *   (properties?: n2n.TURNCredentials.$Properties): n2n.TURNCredentials;
         * }}
         */
        TURNCredentials.create = function(properties) {
            return new TURNCredentials(properties);
        };

        /**
         * Encodes the specified TURNCredentials message. Does not implicitly {@link n2n.TURNCredentials.verify|verify} messages.
         * @function encode
         * @memberof n2n.TURNCredentials
         * @static
         * @param {n2n.TURNCredentials.$Properties} message TURNCredentials message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TURNCredentials.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.username != null && $Object.hasOwnProperty.call(message, "username") && message.username !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.username);
            if (message.password != null && $Object.hasOwnProperty.call(message, "password") && message.password !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.password);
            if (message.ttl != null && $Object.hasOwnProperty.call(message, "ttl") && message.ttl !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.ttl);
            if (message.uris != null && message.uris.length)
                for (let i = 0; i < message.uris.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.uris[i]);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TURNCredentials message, length delimited. Does not implicitly {@link n2n.TURNCredentials.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.TURNCredentials
         * @static
         * @param {n2n.TURNCredentials.$Properties} message TURNCredentials message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TURNCredentials.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a TURNCredentials message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.TURNCredentials
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.TURNCredentials & n2n.TURNCredentials.$Shape} TURNCredentials
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TURNCredentials.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.TURNCredentials();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.username = value;
                        else
                            delete message.username;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.password = value;
                        else
                            delete message.password;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.ttl = value;
                        else
                            delete message.ttl;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if (!(message.uris && message.uris.length))
                            message.uris = [];
                        message.uris.push(reader.string());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TURNCredentials message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.TURNCredentials
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.TURNCredentials & n2n.TURNCredentials.$Shape} TURNCredentials
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TURNCredentials.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TURNCredentials message.
         * @function verify
         * @memberof n2n.TURNCredentials
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TURNCredentials.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.username != null && $Object.hasOwnProperty.call(message, "username"))
                if (!$util.isString(message.username))
                    return "username: string expected";
            if (message.password != null && $Object.hasOwnProperty.call(message, "password"))
                if (!$util.isString(message.password))
                    return "password: string expected";
            if (message.ttl != null && $Object.hasOwnProperty.call(message, "ttl"))
                if (!$util.isInteger(message.ttl))
                    return "ttl: integer expected";
            if (message.uris != null && $Object.hasOwnProperty.call(message, "uris")) {
                if (!$Array.isArray(message.uris))
                    return "uris: array expected";
                for (let i = 0; i < message.uris.length; ++i)
                    if (!$util.isString(message.uris[i]))
                        return "uris: string[] expected";
            }
            return null;
        };

        /**
         * Creates a TURNCredentials message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.TURNCredentials
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.TURNCredentials} TURNCredentials
         */
        TURNCredentials.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.TURNCredentials)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.TURNCredentials: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.TURNCredentials();
            if (object.username != null)
                if (typeof object.username !== "string" || object.username.length)
                    message.username = $String(object.username);
            if (object.password != null)
                if (typeof object.password !== "string" || object.password.length)
                    message.password = $String(object.password);
            if (object.ttl != null)
                if ($Number(object.ttl) !== 0)
                    message.ttl = object.ttl >>> 0;
            if (object.uris) {
                if (!$Array.isArray(object.uris))
                    throw $TypeError(".n2n.TURNCredentials.uris: array expected");
                message.uris = $Array(object.uris.length);
                for (let i = 0; i < object.uris.length; ++i)
                    message.uris[i] = $String(object.uris[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a TURNCredentials message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.TURNCredentials
         * @static
         * @param {n2n.TURNCredentials} message TURNCredentials
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TURNCredentials.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.uris = [];
            if (options.defaults) {
                object.username = "";
                object.password = "";
                object.ttl = 0;
            }
            if (message.username != null && $Object.hasOwnProperty.call(message, "username"))
                object.username = message.username;
            if (message.password != null && $Object.hasOwnProperty.call(message, "password"))
                object.password = message.password;
            if (message.ttl != null && $Object.hasOwnProperty.call(message, "ttl"))
                object.ttl = message.ttl;
            if (message.uris && message.uris.length) {
                object.uris = $Array(message.uris.length);
                for (let j = 0; j < message.uris.length; ++j)
                    object.uris[j] = message.uris[j];
            }
            return object;
        };

        /**
         * Converts this TURNCredentials to JSON.
         * @function toJSON
         * @memberof n2n.TURNCredentials
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TURNCredentials.prototype.toJSON = function() {
            return TURNCredentials.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TURNCredentials
         * @function getTypeUrl
         * @memberof n2n.TURNCredentials
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TURNCredentials.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.TURNCredentials";
        };

        return TURNCredentials;
    })();

    n2n.IppoolLease = (function() {

        /**
         * Properties of an IppoolLease.
         * @typedef {Object} n2n.IppoolLease.$Properties
         * @property {Uint8Array|null} [ip] IppoolLease ip
         * @property {string|null} [mac] IppoolLease mac
         * @property {number|Long|null} [expiryNs] IppoolLease expiryNs
         * @property {boolean|null} [sticky] IppoolLease sticky
         * @property {number|Long|null} [lastRenewNs] IppoolLease lastRenewNs
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an IppoolLease.
         * @memberof n2n
         * @interface IIppoolLease
         * @augments n2n.IppoolLease.$Properties
         * @deprecated Use n2n.IppoolLease.$Properties instead.
         */

        /**
         * Shape of an IppoolLease.
         * @typedef {n2n.IppoolLease.$Properties} n2n.IppoolLease.$Shape
         */

        /**
         * Constructs a new IppoolLease.
         * @memberof n2n
         * @classdesc Represents an IppoolLease.
         * @constructor
         * @param {n2n.IppoolLease.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const IppoolLease = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * IppoolLease ip.
         * @member {Uint8Array} ip
         * @memberof n2n.IppoolLease
         * @instance
         */
        IppoolLease.prototype.ip = $util.newBuffer([]);

        /**
         * IppoolLease mac.
         * @member {string} mac
         * @memberof n2n.IppoolLease
         * @instance
         */
        IppoolLease.prototype.mac = "";

        /**
         * IppoolLease expiryNs.
         * @member {number|Long} expiryNs
         * @memberof n2n.IppoolLease
         * @instance
         */
        IppoolLease.prototype.expiryNs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * IppoolLease sticky.
         * @member {boolean} sticky
         * @memberof n2n.IppoolLease
         * @instance
         */
        IppoolLease.prototype.sticky = false;

        /**
         * IppoolLease lastRenewNs.
         * @member {number|Long} lastRenewNs
         * @memberof n2n.IppoolLease
         * @instance
         */
        IppoolLease.prototype.lastRenewNs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new IppoolLease instance using the specified properties.
         * @function create
         * @memberof n2n.IppoolLease
         * @static
         * @param {n2n.IppoolLease.$Properties=} [properties] Properties to set
         * @returns {n2n.IppoolLease} IppoolLease instance
         * @type {{
         *   (properties: n2n.IppoolLease.$Shape): n2n.IppoolLease & n2n.IppoolLease.$Shape;
         *   (properties?: n2n.IppoolLease.$Properties): n2n.IppoolLease;
         * }}
         */
        IppoolLease.create = function(properties) {
            return new IppoolLease(properties);
        };

        /**
         * Encodes the specified IppoolLease message. Does not implicitly {@link n2n.IppoolLease.verify|verify} messages.
         * @function encode
         * @memberof n2n.IppoolLease
         * @static
         * @param {n2n.IppoolLease.$Properties} message IppoolLease message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IppoolLease.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.ip != null && $Object.hasOwnProperty.call(message, "ip") && message.ip.length)
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.ip);
            if (message.mac != null && $Object.hasOwnProperty.call(message, "mac") && message.mac !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.mac);
            if (message.expiryNs != null && $Object.hasOwnProperty.call(message, "expiryNs") && (typeof message.expiryNs === "object" ? message.expiryNs.low || message.expiryNs.high : message.expiryNs !== 0))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.expiryNs);
            if (message.sticky != null && $Object.hasOwnProperty.call(message, "sticky") && message.sticky !== false)
                writer.uint32(/* id 4, wireType 0 =*/32).bool(message.sticky);
            if (message.lastRenewNs != null && $Object.hasOwnProperty.call(message, "lastRenewNs") && (typeof message.lastRenewNs === "object" ? message.lastRenewNs.low || message.lastRenewNs.high : message.lastRenewNs !== 0))
                writer.uint32(/* id 5, wireType 0 =*/40).int64(message.lastRenewNs);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified IppoolLease message, length delimited. Does not implicitly {@link n2n.IppoolLease.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.IppoolLease
         * @static
         * @param {n2n.IppoolLease.$Properties} message IppoolLease message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IppoolLease.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes an IppoolLease message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.IppoolLease
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.IppoolLease & n2n.IppoolLease.$Shape} IppoolLease
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IppoolLease.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.IppoolLease();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.ip = value;
                        else
                            delete message.ip;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.mac = value;
                        else
                            delete message.mac;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.expiryNs = value;
                        else
                            delete message.expiryNs;
                        continue;
                    }
                case 4: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.sticky = value;
                        else
                            delete message.sticky;
                        continue;
                    }
                case 5: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.lastRenewNs = value;
                        else
                            delete message.lastRenewNs;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an IppoolLease message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.IppoolLease
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.IppoolLease & n2n.IppoolLease.$Shape} IppoolLease
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IppoolLease.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an IppoolLease message.
         * @function verify
         * @memberof n2n.IppoolLease
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        IppoolLease.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.ip != null && $Object.hasOwnProperty.call(message, "ip"))
                if (!(message.ip && typeof message.ip.length === "number" || $util.isString(message.ip)))
                    return "ip: buffer expected";
            if (message.mac != null && $Object.hasOwnProperty.call(message, "mac"))
                if (!$util.isString(message.mac))
                    return "mac: string expected";
            if (message.expiryNs != null && $Object.hasOwnProperty.call(message, "expiryNs"))
                if (!$util.isInteger(message.expiryNs) && !(message.expiryNs && $util.isInteger(message.expiryNs.low) && $util.isInteger(message.expiryNs.high)))
                    return "expiryNs: integer|Long expected";
            if (message.sticky != null && $Object.hasOwnProperty.call(message, "sticky"))
                if (typeof message.sticky !== "boolean")
                    return "sticky: boolean expected";
            if (message.lastRenewNs != null && $Object.hasOwnProperty.call(message, "lastRenewNs"))
                if (!$util.isInteger(message.lastRenewNs) && !(message.lastRenewNs && $util.isInteger(message.lastRenewNs.low) && $util.isInteger(message.lastRenewNs.high)))
                    return "lastRenewNs: integer|Long expected";
            return null;
        };

        /**
         * Creates an IppoolLease message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.IppoolLease
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.IppoolLease} IppoolLease
         */
        IppoolLease.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.IppoolLease)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.IppoolLease: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.IppoolLease();
            if (object.ip != null)
                if (object.ip.length)
                    if (typeof object.ip === "string")
                        $util.base64.decode(object.ip, message.ip = $util.newBuffer($util.base64.length(object.ip)), 0);
                    else if (object.ip.length >= 0)
                        message.ip = object.ip;
            if (object.mac != null)
                if (typeof object.mac !== "string" || object.mac.length)
                    message.mac = $String(object.mac);
            if (object.expiryNs != null)
                if (typeof object.expiryNs === "object" ? object.expiryNs.low || object.expiryNs.high : $Number(object.expiryNs) !== 0)
                    if ($util.Long)
                        message.expiryNs = $util.Long.fromValue(object.expiryNs, false);
                    else if (typeof object.expiryNs === "string")
                        message.expiryNs = $parseInt(object.expiryNs, 10);
                    else if (typeof object.expiryNs === "number")
                        message.expiryNs = object.expiryNs;
                    else if (typeof object.expiryNs === "object")
                        message.expiryNs = new $util.LongBits(object.expiryNs.low >>> 0, object.expiryNs.high >>> 0).toNumber();
            if (object.sticky != null)
                if (object.sticky)
                    message.sticky = $Boolean(object.sticky);
            if (object.lastRenewNs != null)
                if (typeof object.lastRenewNs === "object" ? object.lastRenewNs.low || object.lastRenewNs.high : $Number(object.lastRenewNs) !== 0)
                    if ($util.Long)
                        message.lastRenewNs = $util.Long.fromValue(object.lastRenewNs, false);
                    else if (typeof object.lastRenewNs === "string")
                        message.lastRenewNs = $parseInt(object.lastRenewNs, 10);
                    else if (typeof object.lastRenewNs === "number")
                        message.lastRenewNs = object.lastRenewNs;
                    else if (typeof object.lastRenewNs === "object")
                        message.lastRenewNs = new $util.LongBits(object.lastRenewNs.low >>> 0, object.lastRenewNs.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from an IppoolLease message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.IppoolLease
         * @static
         * @param {n2n.IppoolLease} message IppoolLease
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        IppoolLease.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if (options.bytes === $String)
                    object.ip = "";
                else {
                    object.ip = [];
                    if (options.bytes !== $Array)
                        object.ip = $util.newBuffer(object.ip);
                }
                object.mac = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.expiryNs = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.expiryNs = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                object.sticky = false;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.lastRenewNs = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.lastRenewNs = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            }
            if (message.ip != null && $Object.hasOwnProperty.call(message, "ip"))
                object.ip = options.bytes === $String ? $util.base64.encode(message.ip, 0, message.ip.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.ip) : message.ip;
            if (message.mac != null && $Object.hasOwnProperty.call(message, "mac"))
                object.mac = message.mac;
            if (message.expiryNs != null && $Object.hasOwnProperty.call(message, "expiryNs"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.expiryNs = typeof message.expiryNs === "number" ? $BigInt(message.expiryNs) : $util.Long.fromBits(message.expiryNs.low >>> 0, message.expiryNs.high >>> 0, false).toBigInt();
                else if (typeof message.expiryNs === "number")
                    object.expiryNs = options.longs === $String ? $String(message.expiryNs) : message.expiryNs;
                else
                    object.expiryNs = options.longs === $String ? $util.Long.prototype.toString.call(message.expiryNs) : options.longs === $Number ? new $util.LongBits(message.expiryNs.low >>> 0, message.expiryNs.high >>> 0).toNumber() : message.expiryNs;
            if (message.sticky != null && $Object.hasOwnProperty.call(message, "sticky"))
                object.sticky = message.sticky;
            if (message.lastRenewNs != null && $Object.hasOwnProperty.call(message, "lastRenewNs"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.lastRenewNs = typeof message.lastRenewNs === "number" ? $BigInt(message.lastRenewNs) : $util.Long.fromBits(message.lastRenewNs.low >>> 0, message.lastRenewNs.high >>> 0, false).toBigInt();
                else if (typeof message.lastRenewNs === "number")
                    object.lastRenewNs = options.longs === $String ? $String(message.lastRenewNs) : message.lastRenewNs;
                else
                    object.lastRenewNs = options.longs === $String ? $util.Long.prototype.toString.call(message.lastRenewNs) : options.longs === $Number ? new $util.LongBits(message.lastRenewNs.low >>> 0, message.lastRenewNs.high >>> 0).toNumber() : message.lastRenewNs;
            return object;
        };

        /**
         * Converts this IppoolLease to JSON.
         * @function toJSON
         * @memberof n2n.IppoolLease
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        IppoolLease.prototype.toJSON = function() {
            return IppoolLease.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for IppoolLease
         * @function getTypeUrl
         * @memberof n2n.IppoolLease
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        IppoolLease.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.IppoolLease";
        };

        return IppoolLease;
    })();

    n2n.LeaseEdgeInfos = (function() {

        /**
         * Properties of a LeaseEdgeInfos.
         * @typedef {Object} n2n.LeaseEdgeInfos.$Properties
         * @property {string|null} [edgeId] LeaseEdgeInfos edgeId
         * @property {boolean|null} [isRegistered] LeaseEdgeInfos isRegistered
         * @property {number|Long|null} [timeSinceLastUpdateNs] LeaseEdgeInfos timeSinceLastUpdateNs
         * @property {Uint8Array|null} [virtualIp] LeaseEdgeInfos virtualIp
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a LeaseEdgeInfos.
         * @memberof n2n
         * @interface ILeaseEdgeInfos
         * @augments n2n.LeaseEdgeInfos.$Properties
         * @deprecated Use n2n.LeaseEdgeInfos.$Properties instead.
         */

        /**
         * Shape of a LeaseEdgeInfos.
         * @typedef {n2n.LeaseEdgeInfos.$Properties} n2n.LeaseEdgeInfos.$Shape
         */

        /**
         * Constructs a new LeaseEdgeInfos.
         * @memberof n2n
         * @classdesc Represents a LeaseEdgeInfos.
         * @constructor
         * @param {n2n.LeaseEdgeInfos.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const LeaseEdgeInfos = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * LeaseEdgeInfos edgeId.
         * @member {string} edgeId
         * @memberof n2n.LeaseEdgeInfos
         * @instance
         */
        LeaseEdgeInfos.prototype.edgeId = "";

        /**
         * LeaseEdgeInfos isRegistered.
         * @member {boolean} isRegistered
         * @memberof n2n.LeaseEdgeInfos
         * @instance
         */
        LeaseEdgeInfos.prototype.isRegistered = false;

        /**
         * LeaseEdgeInfos timeSinceLastUpdateNs.
         * @member {number|Long} timeSinceLastUpdateNs
         * @memberof n2n.LeaseEdgeInfos
         * @instance
         */
        LeaseEdgeInfos.prototype.timeSinceLastUpdateNs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * LeaseEdgeInfos virtualIp.
         * @member {Uint8Array} virtualIp
         * @memberof n2n.LeaseEdgeInfos
         * @instance
         */
        LeaseEdgeInfos.prototype.virtualIp = $util.newBuffer([]);

        /**
         * Creates a new LeaseEdgeInfos instance using the specified properties.
         * @function create
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {n2n.LeaseEdgeInfos.$Properties=} [properties] Properties to set
         * @returns {n2n.LeaseEdgeInfos} LeaseEdgeInfos instance
         * @type {{
         *   (properties: n2n.LeaseEdgeInfos.$Shape): n2n.LeaseEdgeInfos & n2n.LeaseEdgeInfos.$Shape;
         *   (properties?: n2n.LeaseEdgeInfos.$Properties): n2n.LeaseEdgeInfos;
         * }}
         */
        LeaseEdgeInfos.create = function(properties) {
            return new LeaseEdgeInfos(properties);
        };

        /**
         * Encodes the specified LeaseEdgeInfos message. Does not implicitly {@link n2n.LeaseEdgeInfos.verify|verify} messages.
         * @function encode
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {n2n.LeaseEdgeInfos.$Properties} message LeaseEdgeInfos message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseEdgeInfos.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.edgeId != null && $Object.hasOwnProperty.call(message, "edgeId") && message.edgeId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.edgeId);
            if (message.isRegistered != null && $Object.hasOwnProperty.call(message, "isRegistered") && message.isRegistered !== false)
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.isRegistered);
            if (message.timeSinceLastUpdateNs != null && $Object.hasOwnProperty.call(message, "timeSinceLastUpdateNs") && (typeof message.timeSinceLastUpdateNs === "object" ? message.timeSinceLastUpdateNs.low || message.timeSinceLastUpdateNs.high : message.timeSinceLastUpdateNs !== 0))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.timeSinceLastUpdateNs);
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp") && message.virtualIp.length)
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.virtualIp);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified LeaseEdgeInfos message, length delimited. Does not implicitly {@link n2n.LeaseEdgeInfos.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {n2n.LeaseEdgeInfos.$Properties} message LeaseEdgeInfos message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseEdgeInfos.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a LeaseEdgeInfos message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.LeaseEdgeInfos & n2n.LeaseEdgeInfos.$Shape} LeaseEdgeInfos
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseEdgeInfos.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.LeaseEdgeInfos();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.edgeId = value;
                        else
                            delete message.edgeId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.isRegistered = value;
                        else
                            delete message.isRegistered;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.timeSinceLastUpdateNs = value;
                        else
                            delete message.timeSinceLastUpdateNs;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.virtualIp = value;
                        else
                            delete message.virtualIp;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a LeaseEdgeInfos message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.LeaseEdgeInfos & n2n.LeaseEdgeInfos.$Shape} LeaseEdgeInfos
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseEdgeInfos.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LeaseEdgeInfos message.
         * @function verify
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LeaseEdgeInfos.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.edgeId != null && $Object.hasOwnProperty.call(message, "edgeId"))
                if (!$util.isString(message.edgeId))
                    return "edgeId: string expected";
            if (message.isRegistered != null && $Object.hasOwnProperty.call(message, "isRegistered"))
                if (typeof message.isRegistered !== "boolean")
                    return "isRegistered: boolean expected";
            if (message.timeSinceLastUpdateNs != null && $Object.hasOwnProperty.call(message, "timeSinceLastUpdateNs"))
                if (!$util.isInteger(message.timeSinceLastUpdateNs) && !(message.timeSinceLastUpdateNs && $util.isInteger(message.timeSinceLastUpdateNs.low) && $util.isInteger(message.timeSinceLastUpdateNs.high)))
                    return "timeSinceLastUpdateNs: integer|Long expected";
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp"))
                if (!(message.virtualIp && typeof message.virtualIp.length === "number" || $util.isString(message.virtualIp)))
                    return "virtualIp: buffer expected";
            return null;
        };

        /**
         * Creates a LeaseEdgeInfos message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.LeaseEdgeInfos} LeaseEdgeInfos
         */
        LeaseEdgeInfos.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.LeaseEdgeInfos)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.LeaseEdgeInfos: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.LeaseEdgeInfos();
            if (object.edgeId != null)
                if (typeof object.edgeId !== "string" || object.edgeId.length)
                    message.edgeId = $String(object.edgeId);
            if (object.isRegistered != null)
                if (object.isRegistered)
                    message.isRegistered = $Boolean(object.isRegistered);
            if (object.timeSinceLastUpdateNs != null)
                if (typeof object.timeSinceLastUpdateNs === "object" ? object.timeSinceLastUpdateNs.low || object.timeSinceLastUpdateNs.high : $Number(object.timeSinceLastUpdateNs) !== 0)
                    if ($util.Long)
                        message.timeSinceLastUpdateNs = $util.Long.fromValue(object.timeSinceLastUpdateNs, false);
                    else if (typeof object.timeSinceLastUpdateNs === "string")
                        message.timeSinceLastUpdateNs = $parseInt(object.timeSinceLastUpdateNs, 10);
                    else if (typeof object.timeSinceLastUpdateNs === "number")
                        message.timeSinceLastUpdateNs = object.timeSinceLastUpdateNs;
                    else if (typeof object.timeSinceLastUpdateNs === "object")
                        message.timeSinceLastUpdateNs = new $util.LongBits(object.timeSinceLastUpdateNs.low >>> 0, object.timeSinceLastUpdateNs.high >>> 0).toNumber();
            if (object.virtualIp != null)
                if (object.virtualIp.length)
                    if (typeof object.virtualIp === "string")
                        $util.base64.decode(object.virtualIp, message.virtualIp = $util.newBuffer($util.base64.length(object.virtualIp)), 0);
                    else if (object.virtualIp.length >= 0)
                        message.virtualIp = object.virtualIp;
            return message;
        };

        /**
         * Creates a plain object from a LeaseEdgeInfos message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {n2n.LeaseEdgeInfos} message LeaseEdgeInfos
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LeaseEdgeInfos.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.edgeId = "";
                object.isRegistered = false;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.timeSinceLastUpdateNs = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.timeSinceLastUpdateNs = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                if (options.bytes === $String)
                    object.virtualIp = "";
                else {
                    object.virtualIp = [];
                    if (options.bytes !== $Array)
                        object.virtualIp = $util.newBuffer(object.virtualIp);
                }
            }
            if (message.edgeId != null && $Object.hasOwnProperty.call(message, "edgeId"))
                object.edgeId = message.edgeId;
            if (message.isRegistered != null && $Object.hasOwnProperty.call(message, "isRegistered"))
                object.isRegistered = message.isRegistered;
            if (message.timeSinceLastUpdateNs != null && $Object.hasOwnProperty.call(message, "timeSinceLastUpdateNs"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.timeSinceLastUpdateNs = typeof message.timeSinceLastUpdateNs === "number" ? $BigInt(message.timeSinceLastUpdateNs) : $util.Long.fromBits(message.timeSinceLastUpdateNs.low >>> 0, message.timeSinceLastUpdateNs.high >>> 0, false).toBigInt();
                else if (typeof message.timeSinceLastUpdateNs === "number")
                    object.timeSinceLastUpdateNs = options.longs === $String ? $String(message.timeSinceLastUpdateNs) : message.timeSinceLastUpdateNs;
                else
                    object.timeSinceLastUpdateNs = options.longs === $String ? $util.Long.prototype.toString.call(message.timeSinceLastUpdateNs) : options.longs === $Number ? new $util.LongBits(message.timeSinceLastUpdateNs.low >>> 0, message.timeSinceLastUpdateNs.high >>> 0).toNumber() : message.timeSinceLastUpdateNs;
            if (message.virtualIp != null && $Object.hasOwnProperty.call(message, "virtualIp"))
                object.virtualIp = options.bytes === $String ? $util.base64.encode(message.virtualIp, 0, message.virtualIp.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.virtualIp) : message.virtualIp;
            return object;
        };

        /**
         * Converts this LeaseEdgeInfos to JSON.
         * @function toJSON
         * @memberof n2n.LeaseEdgeInfos
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LeaseEdgeInfos.prototype.toJSON = function() {
            return LeaseEdgeInfos.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for LeaseEdgeInfos
         * @function getTypeUrl
         * @memberof n2n.LeaseEdgeInfos
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        LeaseEdgeInfos.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.LeaseEdgeInfos";
        };

        return LeaseEdgeInfos;
    })();

    n2n.LeaseWithEdgeInfos = (function() {

        /**
         * Properties of a LeaseWithEdgeInfos.
         * @typedef {Object} n2n.LeaseWithEdgeInfos.$Properties
         * @property {n2n.IppoolLease.$Properties|null} [lease] LeaseWithEdgeInfos lease
         * @property {n2n.LeaseEdgeInfos.$Properties|null} [leaseEdgeInfos] LeaseWithEdgeInfos leaseEdgeInfos
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a LeaseWithEdgeInfos.
         * @memberof n2n
         * @interface ILeaseWithEdgeInfos
         * @augments n2n.LeaseWithEdgeInfos.$Properties
         * @deprecated Use n2n.LeaseWithEdgeInfos.$Properties instead.
         */

        /**
         * Shape of a LeaseWithEdgeInfos.
         * @typedef {n2n.LeaseWithEdgeInfos.$Properties} n2n.LeaseWithEdgeInfos.$Shape
         */

        /**
         * Constructs a new LeaseWithEdgeInfos.
         * @memberof n2n
         * @classdesc Represents a LeaseWithEdgeInfos.
         * @constructor
         * @param {n2n.LeaseWithEdgeInfos.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const LeaseWithEdgeInfos = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * LeaseWithEdgeInfos lease.
         * @member {n2n.IppoolLease.$Properties|null|undefined} lease
         * @memberof n2n.LeaseWithEdgeInfos
         * @instance
         */
        LeaseWithEdgeInfos.prototype.lease = null;

        /**
         * LeaseWithEdgeInfos leaseEdgeInfos.
         * @member {n2n.LeaseEdgeInfos.$Properties|null|undefined} leaseEdgeInfos
         * @memberof n2n.LeaseWithEdgeInfos
         * @instance
         */
        LeaseWithEdgeInfos.prototype.leaseEdgeInfos = null;

        /**
         * Creates a new LeaseWithEdgeInfos instance using the specified properties.
         * @function create
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {n2n.LeaseWithEdgeInfos.$Properties=} [properties] Properties to set
         * @returns {n2n.LeaseWithEdgeInfos} LeaseWithEdgeInfos instance
         * @type {{
         *   (properties: n2n.LeaseWithEdgeInfos.$Shape): n2n.LeaseWithEdgeInfos & n2n.LeaseWithEdgeInfos.$Shape;
         *   (properties?: n2n.LeaseWithEdgeInfos.$Properties): n2n.LeaseWithEdgeInfos;
         * }}
         */
        LeaseWithEdgeInfos.create = function(properties) {
            return new LeaseWithEdgeInfos(properties);
        };

        /**
         * Encodes the specified LeaseWithEdgeInfos message. Does not implicitly {@link n2n.LeaseWithEdgeInfos.verify|verify} messages.
         * @function encode
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {n2n.LeaseWithEdgeInfos.$Properties} message LeaseWithEdgeInfos message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseWithEdgeInfos.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.lease != null && $Object.hasOwnProperty.call(message, "lease"))
                $root.n2n.IppoolLease.encode(message.lease, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.leaseEdgeInfos != null && $Object.hasOwnProperty.call(message, "leaseEdgeInfos"))
                $root.n2n.LeaseEdgeInfos.encode(message.leaseEdgeInfos, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified LeaseWithEdgeInfos message, length delimited. Does not implicitly {@link n2n.LeaseWithEdgeInfos.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {n2n.LeaseWithEdgeInfos.$Properties} message LeaseWithEdgeInfos message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeaseWithEdgeInfos.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a LeaseWithEdgeInfos message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.LeaseWithEdgeInfos & n2n.LeaseWithEdgeInfos.$Shape} LeaseWithEdgeInfos
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseWithEdgeInfos.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.LeaseWithEdgeInfos();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.lease = $root.n2n.IppoolLease.decode(reader, reader.uint32(), $undefined, _depth + 1, message.lease);
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.leaseEdgeInfos = $root.n2n.LeaseEdgeInfos.decode(reader, reader.uint32(), $undefined, _depth + 1, message.leaseEdgeInfos);
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a LeaseWithEdgeInfos message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.LeaseWithEdgeInfos & n2n.LeaseWithEdgeInfos.$Shape} LeaseWithEdgeInfos
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeaseWithEdgeInfos.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LeaseWithEdgeInfos message.
         * @function verify
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LeaseWithEdgeInfos.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.lease != null && $Object.hasOwnProperty.call(message, "lease")) {
                let error = $root.n2n.IppoolLease.verify(message.lease, _depth + 1);
                if (error)
                    return "lease." + error;
            }
            if (message.leaseEdgeInfos != null && $Object.hasOwnProperty.call(message, "leaseEdgeInfos")) {
                let error = $root.n2n.LeaseEdgeInfos.verify(message.leaseEdgeInfos, _depth + 1);
                if (error)
                    return "leaseEdgeInfos." + error;
            }
            return null;
        };

        /**
         * Creates a LeaseWithEdgeInfos message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.LeaseWithEdgeInfos} LeaseWithEdgeInfos
         */
        LeaseWithEdgeInfos.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.LeaseWithEdgeInfos)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.LeaseWithEdgeInfos: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.LeaseWithEdgeInfos();
            if (object.lease != null) {
                if (!$util.isObject(object.lease))
                    throw $TypeError(".n2n.LeaseWithEdgeInfos.lease: object expected");
                message.lease = $root.n2n.IppoolLease.fromObject(object.lease, _depth + 1);
            }
            if (object.leaseEdgeInfos != null) {
                if (!$util.isObject(object.leaseEdgeInfos))
                    throw $TypeError(".n2n.LeaseWithEdgeInfos.leaseEdgeInfos: object expected");
                message.leaseEdgeInfos = $root.n2n.LeaseEdgeInfos.fromObject(object.leaseEdgeInfos, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a LeaseWithEdgeInfos message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {n2n.LeaseWithEdgeInfos} message LeaseWithEdgeInfos
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LeaseWithEdgeInfos.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.lease = null;
                object.leaseEdgeInfos = null;
            }
            if (message.lease != null && $Object.hasOwnProperty.call(message, "lease"))
                object.lease = $root.n2n.IppoolLease.toObject(message.lease, options, _depth + 1);
            if (message.leaseEdgeInfos != null && $Object.hasOwnProperty.call(message, "leaseEdgeInfos"))
                object.leaseEdgeInfos = $root.n2n.LeaseEdgeInfos.toObject(message.leaseEdgeInfos, options, _depth + 1);
            return object;
        };

        /**
         * Converts this LeaseWithEdgeInfos to JSON.
         * @function toJSON
         * @memberof n2n.LeaseWithEdgeInfos
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LeaseWithEdgeInfos.prototype.toJSON = function() {
            return LeaseWithEdgeInfos.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for LeaseWithEdgeInfos
         * @function getTypeUrl
         * @memberof n2n.LeaseWithEdgeInfos
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        LeaseWithEdgeInfos.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.LeaseWithEdgeInfos";
        };

        return LeaseWithEdgeInfos;
    })();

    n2n.LeasesInfos = (function() {

        /**
         * Properties of a LeasesInfos.
         * @typedef {Object} n2n.LeasesInfos.$Properties
         * @property {boolean|null} [isRequest] LeasesInfos isRequest
         * @property {string|null} [communityName] LeasesInfos communityName
         * @property {Object.<string,n2n.LeaseWithEdgeInfos.$Properties>|null} [leasesWithEdgesInfos] LeasesInfos leasesWithEdgesInfos
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a LeasesInfos.
         * @memberof n2n
         * @interface ILeasesInfos
         * @augments n2n.LeasesInfos.$Properties
         * @deprecated Use n2n.LeasesInfos.$Properties instead.
         */

        /**
         * Shape of a LeasesInfos.
         * @typedef {n2n.LeasesInfos.$Properties} n2n.LeasesInfos.$Shape
         */

        /**
         * Constructs a new LeasesInfos.
         * @memberof n2n
         * @classdesc Represents a LeasesInfos.
         * @constructor
         * @param {n2n.LeasesInfos.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const LeasesInfos = function (properties) {
            this.leasesWithEdgesInfos = {};
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * LeasesInfos isRequest.
         * @member {boolean} isRequest
         * @memberof n2n.LeasesInfos
         * @instance
         */
        LeasesInfos.prototype.isRequest = false;

        /**
         * LeasesInfos communityName.
         * @member {string} communityName
         * @memberof n2n.LeasesInfos
         * @instance
         */
        LeasesInfos.prototype.communityName = "";

        /**
         * LeasesInfos leasesWithEdgesInfos.
         * @member {Object.<string,n2n.LeaseWithEdgeInfos.$Properties>} leasesWithEdgesInfos
         * @memberof n2n.LeasesInfos
         * @instance
         */
        LeasesInfos.prototype.leasesWithEdgesInfos = $util.emptyObject;

        /**
         * Creates a new LeasesInfos instance using the specified properties.
         * @function create
         * @memberof n2n.LeasesInfos
         * @static
         * @param {n2n.LeasesInfos.$Properties=} [properties] Properties to set
         * @returns {n2n.LeasesInfos} LeasesInfos instance
         * @type {{
         *   (properties: n2n.LeasesInfos.$Shape): n2n.LeasesInfos & n2n.LeasesInfos.$Shape;
         *   (properties?: n2n.LeasesInfos.$Properties): n2n.LeasesInfos;
         * }}
         */
        LeasesInfos.create = function(properties) {
            return new LeasesInfos(properties);
        };

        /**
         * Encodes the specified LeasesInfos message. Does not implicitly {@link n2n.LeasesInfos.verify|verify} messages.
         * @function encode
         * @memberof n2n.LeasesInfos
         * @static
         * @param {n2n.LeasesInfos.$Properties} message LeasesInfos message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeasesInfos.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.isRequest != null && $Object.hasOwnProperty.call(message, "isRequest") && message.isRequest !== false)
                writer.uint32(/* id 1, wireType 0 =*/8).bool(message.isRequest);
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName") && message.communityName !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.communityName);
            if (message.leasesWithEdgesInfos != null && $Object.hasOwnProperty.call(message, "leasesWithEdgesInfos"))
                for (let keys = $Object.keys(message.leasesWithEdgesInfos), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.n2n.LeaseWithEdgeInfos.encode(message.leasesWithEdgesInfos[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim().ldelim();
                }
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified LeasesInfos message, length delimited. Does not implicitly {@link n2n.LeasesInfos.verify|verify} messages.
         * @function encodeDelimited
         * @memberof n2n.LeasesInfos
         * @static
         * @param {n2n.LeasesInfos.$Properties} message LeasesInfos message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LeasesInfos.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a LeasesInfos message from the specified reader or buffer.
         * @function decode
         * @memberof n2n.LeasesInfos
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {n2n.LeasesInfos & n2n.LeasesInfos.$Shape} LeasesInfos
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeasesInfos.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, key, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.n2n.LeasesInfos();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.uint32();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.isRequest = value;
                        else
                            delete message.isRequest;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.string()).length)
                            message.communityName = value;
                        else
                            delete message.communityName;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if (message.leasesWithEdgesInfos === $util.emptyObject)
                            message.leasesWithEdgesInfos = {};
                        let end2 = reader.uint32() + reader.pos;
                        if (end2 > reader.len)
                            throw $RangeError("index out of range");
                        reader.len = end2;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            wireType = tag2 & 7;
                            switch (tag2 >>>= 3) {
                            case 1:
                                if (wireType !== 2)
                                    break;
                                key = reader.string();
                                continue;
                            case 2:
                                if (wireType !== 2)
                                    break;
                                value = $root.n2n.LeaseWithEdgeInfos.decode(reader, reader.uint32(), $undefined, _depth + 1, value);
                                continue;
                            }
                            reader.skipType(wireType, _depth, tag2);
                        }
                        if (reader.pos !== end2)
                            throw $RangeError("index out of range");
                        reader.len = end;
                        if (key === "__proto__")
                            $util.makeProp(message.leasesWithEdgesInfos, key);
                        message.leasesWithEdgesInfos[key] = value || new $root.n2n.LeaseWithEdgeInfos();
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a LeasesInfos message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof n2n.LeasesInfos
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {n2n.LeasesInfos & n2n.LeasesInfos.$Shape} LeasesInfos
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LeasesInfos.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LeasesInfos message.
         * @function verify
         * @memberof n2n.LeasesInfos
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LeasesInfos.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.isRequest != null && $Object.hasOwnProperty.call(message, "isRequest"))
                if (typeof message.isRequest !== "boolean")
                    return "isRequest: boolean expected";
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName"))
                if (!$util.isString(message.communityName))
                    return "communityName: string expected";
            if (message.leasesWithEdgesInfos != null && $Object.hasOwnProperty.call(message, "leasesWithEdgesInfos")) {
                if (!$util.isObject(message.leasesWithEdgesInfos))
                    return "leasesWithEdgesInfos: object expected";
                let key = $Object.keys(message.leasesWithEdgesInfos);
                for (let i = 0; i < key.length; ++i) {
                    let error = $root.n2n.LeaseWithEdgeInfos.verify(message.leasesWithEdgesInfos[key[i]], _depth + 1);
                    if (error)
                        return "leasesWithEdgesInfos." + error;
                }
            }
            return null;
        };

        /**
         * Creates a LeasesInfos message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof n2n.LeasesInfos
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {n2n.LeasesInfos} LeasesInfos
         */
        LeasesInfos.fromObject = function (object, _depth) {
            if (object instanceof $root.n2n.LeasesInfos)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".n2n.LeasesInfos: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.n2n.LeasesInfos();
            if (object.isRequest != null)
                if (object.isRequest)
                    message.isRequest = $Boolean(object.isRequest);
            if (object.communityName != null)
                if (typeof object.communityName !== "string" || object.communityName.length)
                    message.communityName = $String(object.communityName);
            if (object.leasesWithEdgesInfos) {
                if (!$util.isObject(object.leasesWithEdgesInfos))
                    throw $TypeError(".n2n.LeasesInfos.leasesWithEdgesInfos: object expected");
                message.leasesWithEdgesInfos = {};
                for (let keys = $Object.keys(object.leasesWithEdgesInfos), i = 0; i < keys.length; ++i) {
                    if (keys[i] === "__proto__")
                        $util.makeProp(message.leasesWithEdgesInfos, keys[i]);
                    if (!$util.isObject(object.leasesWithEdgesInfos[keys[i]]))
                        throw $TypeError(".n2n.LeasesInfos.leasesWithEdgesInfos: object expected");
                    message.leasesWithEdgesInfos[keys[i]] = $root.n2n.LeaseWithEdgeInfos.fromObject(object.leasesWithEdgesInfos[keys[i]], _depth + 1);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a LeasesInfos message. Also converts values to other types if specified.
         * @function toObject
         * @memberof n2n.LeasesInfos
         * @static
         * @param {n2n.LeasesInfos} message LeasesInfos
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LeasesInfos.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.objects || options.defaults)
                object.leasesWithEdgesInfos = {};
            if (options.defaults) {
                object.isRequest = false;
                object.communityName = "";
            }
            if (message.isRequest != null && $Object.hasOwnProperty.call(message, "isRequest"))
                object.isRequest = message.isRequest;
            if (message.communityName != null && $Object.hasOwnProperty.call(message, "communityName"))
                object.communityName = message.communityName;
            let keys2;
            if (message.leasesWithEdgesInfos && (keys2 = $Object.keys(message.leasesWithEdgesInfos)).length) {
                object.leasesWithEdgesInfos = {};
                for (let j = 0; j < keys2.length; ++j) {
                    if (keys2[j] === "__proto__")
                        $util.makeProp(object.leasesWithEdgesInfos, keys2[j]);
                    object.leasesWithEdgesInfos[keys2[j]] = $root.n2n.LeaseWithEdgeInfos.toObject(message.leasesWithEdgesInfos[keys2[j]], options, _depth + 1);
                }
            }
            return object;
        };

        /**
         * Converts this LeasesInfos to JSON.
         * @function toJSON
         * @memberof n2n.LeasesInfos
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LeasesInfos.prototype.toJSON = function() {
            return LeasesInfos.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for LeasesInfos
         * @function getTypeUrl
         * @memberof n2n.LeasesInfos
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        LeasesInfos.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/n2n.LeasesInfos";
        };

        return LeasesInfos;
    })();

    return n2n;
})();

export {
  $root as default
};
