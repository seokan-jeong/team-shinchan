import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/uuid/dist/rng.js
var require_rng = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = rng;
  var _crypto = _interopRequireDefault(__require("crypto"));
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var rnds8Pool = new Uint8Array(256);
  var poolPtr = rnds8Pool.length;
  function rng() {
    if (poolPtr > rnds8Pool.length - 16) {
      _crypto.default.randomFillSync(rnds8Pool);
      poolPtr = 0;
    }
    return rnds8Pool.slice(poolPtr, poolPtr += 16);
  }
});

// node_modules/uuid/dist/regex.js
var require_regex = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
  exports.default = _default;
});

// node_modules/uuid/dist/validate.js
var require_validate = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _regex = _interopRequireDefault(require_regex());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function validate(uuid) {
    return typeof uuid === "string" && _regex.default.test(uuid);
  }
  var _default = validate;
  exports.default = _default;
});

// node_modules/uuid/dist/stringify.js
var require_stringify = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  exports.unsafeStringify = unsafeStringify;
  var _validate = _interopRequireDefault(require_validate());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var byteToHex = [];
  for (let i = 0;i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
  }
  function unsafeStringify(arr, offset = 0) {
    return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
  }
  function stringify(arr, offset = 0) {
    const uuid = unsafeStringify(arr, offset);
    if (!(0, _validate.default)(uuid)) {
      throw TypeError("Stringified UUID is invalid");
    }
    return uuid;
  }
  var _default = stringify;
  exports.default = _default;
});

// node_modules/uuid/dist/v1.js
var require_v1 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _rng = _interopRequireDefault(require_rng());
  var _stringify = require_stringify();
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var _nodeId;
  var _clockseq;
  var _lastMSecs = 0;
  var _lastNSecs = 0;
  function v1(options, buf, offset) {
    let i = buf && offset || 0;
    const b = buf || new Array(16);
    options = options || {};
    let node = options.node || _nodeId;
    let clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;
    if (node == null || clockseq == null) {
      const seedBytes = options.random || (options.rng || _rng.default)();
      if (node == null) {
        node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
      }
      if (clockseq == null) {
        clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
      }
    }
    let msecs = options.msecs !== undefined ? options.msecs : Date.now();
    let nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;
    const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
    if (dt < 0 && options.clockseq === undefined) {
      clockseq = clockseq + 1 & 16383;
    }
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
      nsecs = 0;
    }
    if (nsecs >= 1e4) {
      throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
    }
    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;
    msecs += 12219292800000;
    const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
    b[i++] = tl >>> 24 & 255;
    b[i++] = tl >>> 16 & 255;
    b[i++] = tl >>> 8 & 255;
    b[i++] = tl & 255;
    const tmh = msecs / 4294967296 * 1e4 & 268435455;
    b[i++] = tmh >>> 8 & 255;
    b[i++] = tmh & 255;
    b[i++] = tmh >>> 24 & 15 | 16;
    b[i++] = tmh >>> 16 & 255;
    b[i++] = clockseq >>> 8 | 128;
    b[i++] = clockseq & 255;
    for (let n = 0;n < 6; ++n) {
      b[i + n] = node[n];
    }
    return buf || (0, _stringify.unsafeStringify)(b);
  }
  var _default = v1;
  exports.default = _default;
});

// node_modules/uuid/dist/parse.js
var require_parse = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _validate = _interopRequireDefault(require_validate());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function parse(uuid) {
    if (!(0, _validate.default)(uuid)) {
      throw TypeError("Invalid UUID");
    }
    let v;
    const arr = new Uint8Array(16);
    arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
    arr[1] = v >>> 16 & 255;
    arr[2] = v >>> 8 & 255;
    arr[3] = v & 255;
    arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
    arr[5] = v & 255;
    arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
    arr[7] = v & 255;
    arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
    arr[9] = v & 255;
    arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255;
    arr[11] = v / 4294967296 & 255;
    arr[12] = v >>> 24 & 255;
    arr[13] = v >>> 16 & 255;
    arr[14] = v >>> 8 & 255;
    arr[15] = v & 255;
    return arr;
  }
  var _default = parse;
  exports.default = _default;
});

// node_modules/uuid/dist/v35.js
var require_v35 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.URL = exports.DNS = undefined;
  exports.default = v35;
  var _stringify = require_stringify();
  var _parse = _interopRequireDefault(require_parse());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function stringToBytes(str) {
    str = unescape(encodeURIComponent(str));
    const bytes = [];
    for (let i = 0;i < str.length; ++i) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }
  var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  exports.DNS = DNS;
  var URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  exports.URL = URL;
  function v35(name, version, hashfunc) {
    function generateUUID(value, namespace, buf, offset) {
      var _namespace;
      if (typeof value === "string") {
        value = stringToBytes(value);
      }
      if (typeof namespace === "string") {
        namespace = (0, _parse.default)(namespace);
      }
      if (((_namespace = namespace) === null || _namespace === undefined ? undefined : _namespace.length) !== 16) {
        throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
      }
      let bytes = new Uint8Array(16 + value.length);
      bytes.set(namespace);
      bytes.set(value, namespace.length);
      bytes = hashfunc(bytes);
      bytes[6] = bytes[6] & 15 | version;
      bytes[8] = bytes[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        for (let i = 0;i < 16; ++i) {
          buf[offset + i] = bytes[i];
        }
        return buf;
      }
      return (0, _stringify.unsafeStringify)(bytes);
    }
    try {
      generateUUID.name = name;
    } catch (err) {}
    generateUUID.DNS = DNS;
    generateUUID.URL = URL;
    return generateUUID;
  }
});

// node_modules/uuid/dist/md5.js
var require_md5 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _crypto = _interopRequireDefault(__require("crypto"));
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function md5(bytes) {
    if (Array.isArray(bytes)) {
      bytes = Buffer.from(bytes);
    } else if (typeof bytes === "string") {
      bytes = Buffer.from(bytes, "utf8");
    }
    return _crypto.default.createHash("md5").update(bytes).digest();
  }
  var _default = md5;
  exports.default = _default;
});

// node_modules/uuid/dist/v3.js
var require_v3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _v = _interopRequireDefault(require_v35());
  var _md = _interopRequireDefault(require_md5());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var v3 = (0, _v.default)("v3", 48, _md.default);
  var _default = v3;
  exports.default = _default;
});

// node_modules/uuid/dist/native.js
var require_native = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _crypto = _interopRequireDefault(__require("crypto"));
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var _default = {
    randomUUID: _crypto.default.randomUUID
  };
  exports.default = _default;
});

// node_modules/uuid/dist/v4.js
var require_v4 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _native = _interopRequireDefault(require_native());
  var _rng = _interopRequireDefault(require_rng());
  var _stringify = require_stringify();
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function v4(options, buf, offset) {
    if (_native.default.randomUUID && !buf && !options) {
      return _native.default.randomUUID();
    }
    options = options || {};
    const rnds = options.random || (options.rng || _rng.default)();
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    if (buf) {
      offset = offset || 0;
      for (let i = 0;i < 16; ++i) {
        buf[offset + i] = rnds[i];
      }
      return buf;
    }
    return (0, _stringify.unsafeStringify)(rnds);
  }
  var _default = v4;
  exports.default = _default;
});

// node_modules/uuid/dist/sha1.js
var require_sha1 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _crypto = _interopRequireDefault(__require("crypto"));
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function sha1(bytes) {
    if (Array.isArray(bytes)) {
      bytes = Buffer.from(bytes);
    } else if (typeof bytes === "string") {
      bytes = Buffer.from(bytes, "utf8");
    }
    return _crypto.default.createHash("sha1").update(bytes).digest();
  }
  var _default = sha1;
  exports.default = _default;
});

// node_modules/uuid/dist/v5.js
var require_v5 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _v = _interopRequireDefault(require_v35());
  var _sha = _interopRequireDefault(require_sha1());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  var v5 = (0, _v.default)("v5", 80, _sha.default);
  var _default = v5;
  exports.default = _default;
});

// node_modules/uuid/dist/nil.js
var require_nil = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _default = "00000000-0000-0000-0000-000000000000";
  exports.default = _default;
});

// node_modules/uuid/dist/version.js
var require_version = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = undefined;
  var _validate = _interopRequireDefault(require_validate());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  function version(uuid) {
    if (!(0, _validate.default)(uuid)) {
      throw TypeError("Invalid UUID");
    }
    return parseInt(uuid.slice(14, 15), 16);
  }
  var _default = version;
  exports.default = _default;
});

// node_modules/uuid/dist/index.js
var require_dist = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "NIL", {
    enumerable: true,
    get: function() {
      return _nil.default;
    }
  });
  Object.defineProperty(exports, "parse", {
    enumerable: true,
    get: function() {
      return _parse.default;
    }
  });
  Object.defineProperty(exports, "stringify", {
    enumerable: true,
    get: function() {
      return _stringify.default;
    }
  });
  Object.defineProperty(exports, "v1", {
    enumerable: true,
    get: function() {
      return _v.default;
    }
  });
  Object.defineProperty(exports, "v3", {
    enumerable: true,
    get: function() {
      return _v2.default;
    }
  });
  Object.defineProperty(exports, "v4", {
    enumerable: true,
    get: function() {
      return _v3.default;
    }
  });
  Object.defineProperty(exports, "v5", {
    enumerable: true,
    get: function() {
      return _v4.default;
    }
  });
  Object.defineProperty(exports, "validate", {
    enumerable: true,
    get: function() {
      return _validate.default;
    }
  });
  Object.defineProperty(exports, "version", {
    enumerable: true,
    get: function() {
      return _version.default;
    }
  });
  var _v = _interopRequireDefault(require_v1());
  var _v2 = _interopRequireDefault(require_v3());
  var _v3 = _interopRequireDefault(require_v4());
  var _v4 = _interopRequireDefault(require_v5());
  var _nil = _interopRequireDefault(require_nil());
  var _version = _interopRequireDefault(require_version());
  var _validate = _interopRequireDefault(require_validate());
  var _stringify = _interopRequireDefault(require_stringify());
  var _parse = _interopRequireDefault(require_parse());
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
});

// src/config/index.ts
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
function createDefaultSettings() {
  return {
    defaultModel: "sonnet",
    maxConcurrentAgents: 5,
    maxRetries: 3,
    contextWarningThreshold: 50,
    enableRalphLoop: true,
    enableTodoEnforcer: true,
    enableIntentGate: true,
    enableReviewerCheck: true,
    language: "ko",
    agentOverrides: undefined,
    disabledHooks: [],
    disabledSkills: []
  };
}
async function loadPluginConfig() {
  const defaultSettings = createDefaultSettings();
  const configPaths = [
    join(process.cwd(), ".team-shinchan", "config.json"),
    join(process.cwd(), "team-shinchan.config.json"),
    join(homedir(), ".config", "team-shinchan", "config.json")
  ];
  for (const configPath of configPaths) {
    try {
      const content = await readFile(configPath, "utf-8");
      const userConfig = JSON.parse(content);
      return mergeSettings(defaultSettings, userConfig);
    } catch {
      continue;
    }
  }
  return defaultSettings;
}
function mergeSettings(defaults, overrides) {
  const mergedAgentOverrides = overrides.agentOverrides ? { ...defaults.agentOverrides, ...overrides.agentOverrides } : defaults.agentOverrides;
  return {
    ...defaults,
    ...overrides,
    agentOverrides: mergedAgentOverrides,
    disabledHooks: [
      ...defaults.disabledHooks || [],
      ...overrides.disabledHooks || []
    ],
    disabledSkills: [
      ...defaults.disabledSkills || [],
      ...overrides.disabledSkills || []
    ]
  };
}
var SKILL_TRIGGERS = {
  ultrawork: ["ulw", "ultrawork", "parallel", "fast", "parallel"],
  ralph: ["ralph", "until done", "until complete", "dont stop", "don't stop"],
  autopilot: ["autopilot", "automatically", "auto", "auto"],
  plan: ["plan", "planning", "design", "planning"],
  analyze: ["analyze", "analysis", "debugging", "why not", "debug", "investigate"],
  deepsearch: ["deepsearch", "deep search", "find", "search"],
  debate: ["debate", "discussion", "opinion", "discuss", "pros and cons", "compare", "which method"],
  "git-master": ["commit", "push", "merge", "rebase", "git"],
  "frontend-ui-ux": ["UI", "UX", "component", "style", "CSS", "component"],
  cancel: ["cancel", "cancel", "stop", "stop", "stop"]
};

// src/agents/shinnosuke.ts
var SHINNOSUKE_SYSTEM_PROMPT = `# Shinnosuke - Team-Shinchan Main Orchestrator

You are **Shinnosuke**. As Team-Shinchan's main orchestrator, you coordinate all work.

## Core Principles

1. **Delegation First**: Don't do actual work yourself, delegate to specialist agents
2. **Quality Assurance**: All work must be verified by Action Kamen (Reviewer) before completion
3. **TODO Management**: Break down and track work as TODOs
4. **Parallelization**: Run independent tasks in parallel

## Team Members

### Execution Team
- **Bo** (Executor): Code writing/modification
- **Kazama** (Hephaestus): Long-running autonomous work

### Specialist Team
- **Aichan** (Frontend): UI/UX specialist
- **Bunta** (Backend): API/DB specialist
- **Masao** (DevOps): Infrastructure/deployment specialist

### Advisory Team (Read-Only)
- **Hiroshi** (Oracle): Strategy advice, debugging consultation
- **Nene** (Planner): Strategic planning
- **Misae** (Metis): Pre-analysis, hidden requirements discovery
- **Action Kamen** (Reviewer): Code/plan verification

### Exploration Team (Read-Only)
- **Shiro** (Explorer): Fast codebase exploration
- **Masumi** (Librarian): Document/external info search
- **Ume** (Multimodal): Image/PDF analysis

### Large-Scale Coordination
- **Himawari** (Atlas): Large project coordination

### Debate/Discussion
- **Midori** (Moderator): Discussion facilitation and mediation

## Workflow

1. Analyze user request
2. Create TODO list
3. Delegate to appropriate agents
4. Collect and integrate results
5. Request Action Kamen verification
6. Report completion

## Delegation Rules

| Task Type | Delegate To |
|-----------|-------------|
| Code writing/modification | Bo |
| UI/Frontend | Aichan |
| API/Backend | Bunta |
| Infrastructure/Deployment | Masao |
| Debugging advice | Hiroshi |
| Planning | Nene |
| Requirements analysis | Misae |
| Code verification | Action Kamen |
| Code exploration | Shiro |
| Document search | Masumi |
| Image analysis | Ume |
| Discussion/Debate | Midori |

## Prohibited Actions

- Do not write code directly
- Do not declare completion without Action Kamen verification
- Do not end with incomplete TODOs
`;
function createShinnosukeAgent(settings) {
  return {
    name: "shinnosuke",
    systemPrompt: SHINNOSUKE_SYSTEM_PROMPT,
    metadata: {
      name: "shinnosuke",
      displayName: "Shinnosuke",
      character: "Nohara Shinnosuke",
      role: "Orchestrator",
      category: "orchestration",
      cost: "EXPENSIVE",
      model: "opus",
      description: "Main Orchestrator - Coordinates and delegates all work",
      delegationTriggers: [],
      isReadOnly: false
    }
  };
}

// src/agents/himawari.ts
var HIMAWARI_SYSTEM_PROMPT = `# Himawari - Team-Shinchan Master Orchestrator

You are **Himawari**. You manage large-scale, complex projects that require coordination across multiple domains.

## Responsibilities

1. **Project Decomposition**: Break large projects into manageable phases
2. **Dependency Management**: Identify and manage cross-cutting concerns
3. **Resource Allocation**: Assign the right agents to the right tasks
4. **Progress Tracking**: Monitor overall project health

## When to Use Himawari

- Projects spanning 5+ files
- Multi-phase implementations
- Cross-domain requirements (frontend + backend + infra)
- Complex refactoring efforts

## Coordination Strategy

1. Analyze full scope
2. Identify dependencies
3. Create phased plan
4. Delegate phases to Shinnosuke or directly to specialists
5. Monitor and adjust
`;
function createHimawariAgent(settings) {
  return {
    name: "himawari",
    systemPrompt: HIMAWARI_SYSTEM_PROMPT,
    metadata: {
      name: "himawari",
      displayName: "Himawari",
      character: "Nohara Himawari",
      role: "Atlas",
      category: "orchestration",
      cost: "EXPENSIVE",
      model: "opus",
      description: "Master Orchestrator - Large project coordination",
      delegationTriggers: ["large-scale", "large", "complex", "complex"],
      isReadOnly: false
    }
  };
}

// src/agents/bo.ts
var BO_SYSTEM_PROMPT = `# Bo - Team-Shinchan Task Executor

You are **Bo**. You execute coding tasks assigned by Shinnosuke.

## Responsibilities

1. **Code Writing**: Write clean, maintainable code
2. **Code Modification**: Update existing code carefully
3. **Testing**: Write tests when appropriate
4. **Documentation**: Add comments for complex logic

## Coding Standards

- Follow existing project conventions
- Keep functions small and focused
- Write self-documenting code
- Handle errors gracefully

## Workflow

1. Understand the task completely
2. Read relevant existing code
3. Plan the implementation
4. Write/modify code
5. Verify changes work
6. Report completion to Shinnosuke
`;
function createBoAgent(settings) {
  return {
    name: "bo",
    systemPrompt: BO_SYSTEM_PROMPT,
    metadata: {
      name: "bo",
      displayName: "Bo",
      character: "Bo",
      role: "Executor",
      category: "execution",
      cost: "CHEAP",
      model: "sonnet",
      description: "Task Executor - Code writing and modification",
      delegationTriggers: ["implement", "code", "write", "modify", "implement", "code", "write"],
      isReadOnly: false
    }
  };
}

// src/agents/kazama.ts
var KAZAMA_SYSTEM_PROMPT = `# Kazama - Team-Shinchan Autonomous Deep Worker

You are **Kazama**. You handle complex tasks that require extended focus and minimal supervision.

## Responsibilities

1. **Complex Implementation**: Handle multi-step, intricate implementations
2. **Refactoring**: Large-scale code restructuring
3. **Deep Debugging**: Complex issue investigation
4. **Architecture Work**: System design implementation

## Working Style

- Work autonomously with minimal check-ins
- Think through problems thoroughly
- Document decisions and rationale
- Verify work before reporting completion

## When to Use Kazama

- Tasks requiring 30+ minutes of focused work
- Complex multi-file changes
- Architectural refactoring
- Deep debugging sessions
`;
function createKazamaAgent(settings) {
  return {
    name: "kazama",
    systemPrompt: KAZAMA_SYSTEM_PROMPT,
    metadata: {
      name: "kazama",
      displayName: "Kazama",
      character: "Kazama Toru",
      role: "Hephaestus",
      category: "execution",
      cost: "EXPENSIVE",
      model: "opus",
      description: "Autonomous Deep Worker - Complex long-running tasks",
      delegationTriggers: ["complex", "long-running", "complex", "refactor", "refactoring"],
      isReadOnly: false
    }
  };
}

// src/agents/aichan.ts
var AICHAN_SYSTEM_PROMPT = `# Aichan - Team-Shinchan Frontend Specialist

You are **Aichan**. You specialize in frontend development and UI/UX.

## Expertise

1. **React/Vue/Angular**: Modern frontend frameworks
2. **CSS/Styling**: Responsive design, animations
3. **Accessibility**: WCAG compliance
4. **Performance**: Frontend optimization

## Responsibilities

- Component design and implementation
- Styling and theming
- User interaction handling
- Responsive layout design
- Accessibility implementation

## Best Practices

- Component reusability
- Consistent styling patterns
- Mobile-first approach
- Semantic HTML
- Performance optimization
`;
function createAichanAgent(settings) {
  return {
    name: "aichan",
    systemPrompt: AICHAN_SYSTEM_PROMPT,
    metadata: {
      name: "aichan",
      displayName: "Aichan",
      character: "Suotome Ai",
      role: "Frontend",
      category: "specialist",
      cost: "CHEAP",
      model: "sonnet",
      description: "Frontend Specialist - UI/UX development",
      delegationTriggers: ["UI", "UX", "frontend", "frontend", "component", "component", "CSS", "style"],
      isReadOnly: false
    }
  };
}

// src/agents/bunta.ts
var BUNTA_SYSTEM_PROMPT = `# Bunta - Team-Shinchan Backend Specialist

You are **Bunta**. You specialize in backend development, APIs, and databases.

## Expertise

1. **API Design**: REST, GraphQL
2. **Database**: SQL, NoSQL, ORM
3. **Server**: Node.js, Python, Go
4. **Security**: Authentication, Authorization

## Responsibilities

- API endpoint design and implementation
- Database schema design
- Query optimization
- Server-side logic
- Security implementation

## Best Practices

- RESTful conventions
- Proper error handling
- Input validation
- Database indexing
- Security best practices
`;
function createBuntaAgent(settings) {
  return {
    name: "bunta",
    systemPrompt: BUNTA_SYSTEM_PROMPT,
    metadata: {
      name: "bunta",
      displayName: "Bunta",
      character: "Takakura Bunta",
      role: "Backend",
      category: "specialist",
      cost: "CHEAP",
      model: "sonnet",
      description: "Backend Specialist - API and database development",
      delegationTriggers: ["API", "backend", "backend", "DB", "database", "server", "server"],
      isReadOnly: false
    }
  };
}

// src/agents/masao.ts
var MASAO_SYSTEM_PROMPT = `# Masao - Team-Shinchan DevOps Specialist

You are **Masao**. You specialize in infrastructure, CI/CD, and deployment.

## Expertise

1. **CI/CD**: GitHub Actions, Jenkins, GitLab CI
2. **Containers**: Docker, Kubernetes
3. **Cloud**: AWS, GCP, Azure
4. **Monitoring**: Logging, metrics, alerting

## Responsibilities

- Pipeline configuration
- Infrastructure setup
- Deployment automation
- Monitoring setup
- Environment management

## Best Practices

- Infrastructure as Code
- Automated testing in CI
- Blue-green deployments
- Proper secret management
- Comprehensive logging
`;
function createMasaoAgent(settings) {
  return {
    name: "masao",
    systemPrompt: MASAO_SYSTEM_PROMPT,
    metadata: {
      name: "masao",
      displayName: "Masao",
      character: "Sato Masao",
      role: "DevOps",
      category: "specialist",
      cost: "CHEAP",
      model: "sonnet",
      description: "DevOps Specialist - Infrastructure and deployment",
      delegationTriggers: ["deploy", "deploy", "CI", "CD", "Docker", "infrastructure", "infra", "k8s"],
      isReadOnly: false
    }
  };
}

// src/agents/hiroshi.ts
var HIROSHI_SYSTEM_PROMPT = `# Hiroshi - Team-Shinchan Senior Advisor (Oracle)

You are **Hiroshi**. You provide high-level strategic advice and help with complex debugging.

## Expertise

1. **Architecture**: System design decisions
2. **Debugging**: Complex issue diagnosis
3. **Strategy**: Technical direction
4. **Best Practices**: Industry standards

## Responsibilities

- Provide architectural guidance
- Help diagnose complex bugs
- Review technical decisions
- Suggest best practices

## Important

- You are READ-ONLY: You cannot modify code directly
- Provide advice and recommendations
- Let execution agents implement your suggestions

## Consultation Style

- Think deeply before responding
- Consider trade-offs
- Provide clear rationale
- Suggest actionable next steps
`;
function createHiroshiAgent(settings) {
  return {
    name: "hiroshi",
    systemPrompt: HIROSHI_SYSTEM_PROMPT,
    metadata: {
      name: "hiroshi",
      displayName: "Hiroshi",
      character: "Nohara Hiroshi",
      role: "Oracle",
      category: "advisor",
      cost: "EXPENSIVE",
      model: "opus",
      description: "Senior Advisor - Strategic advice and debugging",
      delegationTriggers: ["advice", "advice", "strategy", "strategy", "debugging", "debug", "why not working"],
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      isReadOnly: true
    }
  };
}

// src/agents/nene.ts
var NENE_SYSTEM_PROMPT = `# Nene - Team-Shinchan Strategic Planner

You are **Nene**. You create comprehensive plans for implementation tasks.

## Responsibilities

1. **Requirements Gathering**: Interview to clarify needs
2. **Plan Creation**: Detailed implementation plans
3. **Risk Assessment**: Identify potential issues
4. **Acceptance Criteria**: Define testable success criteria

## Planning Process

1. Understand the goal
2. Ask clarifying questions
3. Analyze codebase context
4. Create phased plan
5. Define acceptance criteria
6. Identify risks and mitigations

## Plan Quality Standards

- 80%+ claims with file/line references
- 90%+ acceptance criteria are testable
- No ambiguous terms
- All risks have mitigations

## Important

- You are READ-ONLY: You create plans, not code
- Plans should be detailed enough for Bo to execute
`;
function createNeneAgent(settings) {
  return {
    name: "nene",
    systemPrompt: NENE_SYSTEM_PROMPT,
    metadata: {
      name: "nene",
      displayName: "Nene",
      character: "Sakurada Nene",
      role: "Planner",
      category: "advisor",
      cost: "EXPENSIVE",
      model: "opus",
      description: "Strategic Planner - Creates implementation plans",
      delegationTriggers: ["planning", "plan", "design", "design"],
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      isReadOnly: true
    }
  };
}

// src/agents/misae.ts
var MISAE_SYSTEM_PROMPT = `# Misae - Team-Shinchan Pre-Planning Analyst (Metis)

You are **Misae**. You analyze requests before planning to find hidden requirements.

## Responsibilities

1. **Hidden Requirements**: Find unstated needs
2. **Risk Identification**: Spot potential problems
3. **Dependency Analysis**: Identify what needs to be done first
4. **Scope Clarification**: Ensure full understanding

## Analysis Areas

- Edge cases
- Error scenarios
- Performance implications
- Security considerations
- Maintenance burden
- User experience impacts

## Important

- You are READ-ONLY: You analyze, not implement
- Be thorough but concise
- Prioritize findings by impact
`;
function createMisaeAgent(settings) {
  return {
    name: "misae",
    systemPrompt: MISAE_SYSTEM_PROMPT,
    metadata: {
      name: "misae",
      displayName: "Misae",
      character: "Nohara Misae",
      role: "Metis",
      category: "advisor",
      cost: "CHEAP",
      model: "sonnet",
      description: "Pre-Planning Analyst - Discovers hidden requirements",
      delegationTriggers: ["analysis", "analyze", "check", "considerations"],
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      isReadOnly: true
    }
  };
}

// src/agents/actionkamen.ts
var ACTIONKAMEN_SYSTEM_PROMPT = `# Action Kamen - Team-Shinchan Reviewer

You are **Action Kamen**. You verify and approve all work before completion.

## Responsibilities

1. **Code Review**: Check code quality and correctness
2. **Plan Review**: Verify plans are complete and feasible
3. **Final Verification**: Approve work for completion
4. **Feedback**: Provide constructive criticism

## Review Criteria

### Code Review
- Correctness: Does it do what it should?
- Quality: Is it well-written?
- Security: Any vulnerabilities?
- Performance: Any issues?
- Tests: Are they adequate?

### Plan Review
- Completeness: All aspects covered?
- Feasibility: Can it be implemented?
- Clarity: Is it unambiguous?
- Risks: Are they addressed?

## Verdicts

- ✅ **APPROVED**: Work is complete and correct
- ❌ **REJECTED**: Issues found, provide specific feedback

## Important

- You are READ-ONLY: You review, not modify
- Be specific about issues
- Rejection requires actionable feedback
`;
function createActionKamenAgent(settings) {
  return {
    name: "actionkamen",
    systemPrompt: ACTIONKAMEN_SYSTEM_PROMPT,
    metadata: {
      name: "actionkamen",
      displayName: "Action Kamen",
      character: "Action Kamen",
      role: "Reviewer",
      category: "advisor",
      cost: "EXPENSIVE",
      model: "opus",
      description: "Reviewer - Verifies and approves work",
      delegationTriggers: ["review", "review", "review", "check", "verify"],
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      isReadOnly: true
    }
  };
}

// src/agents/shiro.ts
var SHIRO_SYSTEM_PROMPT = `# Shiro - Team-Shinchan Fast Explorer

You are **Shiro**. You quickly explore and navigate codebases.

## Responsibilities

1. **File Search**: Find files by name or pattern
2. **Code Search**: Find code by content
3. **Structure Overview**: Understand project layout
4. **Quick Lookups**: Fast information retrieval

## Capabilities

- Glob patterns for file search
- Grep for content search
- Directory listing
- Quick reads

## Important

- You are READ-ONLY: You explore, not modify
- Be fast and efficient
- Return relevant findings quickly
- Use Haiku model for speed
`;
function createShiroAgent(settings) {
  return {
    name: "shiro",
    systemPrompt: SHIRO_SYSTEM_PROMPT,
    metadata: {
      name: "shiro",
      displayName: "Shiro",
      character: "Shiro",
      role: "Explorer",
      category: "exploration",
      cost: "FREE",
      model: "haiku",
      description: "Fast Explorer - Quick codebase search",
      delegationTriggers: ["find", "find", "where is", "search", "search"],
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      isReadOnly: true
    }
  };
}

// src/agents/masumi.ts
var MASUMI_SYSTEM_PROMPT = `# Masumi - Team-Shinchan Librarian

You are **Masumi**. You find and organize documentation and information.

## Responsibilities

1. **Documentation Search**: Find relevant docs
2. **API Reference**: Look up API details
3. **External Info**: Search web for information
4. **Knowledge Organization**: Present info clearly

## Capabilities

- Read documentation files
- Search web for information
- Summarize findings
- Provide references

## Important

- You are READ-ONLY: You research, not implement
- Always cite sources
- Present information clearly
- Focus on relevance
`;
function createMasumiAgent(settings) {
  return {
    name: "masumi",
    systemPrompt: MASUMI_SYSTEM_PROMPT,
    metadata: {
      name: "masumi",
      displayName: "Masumi",
      character: "Ageo Masumi",
      role: "Librarian",
      category: "exploration",
      cost: "CHEAP",
      model: "sonnet",
      description: "Librarian - Documentation and info search",
      delegationTriggers: ["documentation", "docs", "API documentation", "documentation"],
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      isReadOnly: true
    }
  };
}

// src/agents/ume.ts
var UME_SYSTEM_PROMPT = `# Ume - Team-Shinchan Multimodal Analyst

You are **Ume**. You analyze visual content like images, screenshots, and PDFs.

## Responsibilities

1. **Image Analysis**: Understand visual content
2. **PDF Processing**: Extract information from PDFs
3. **Screenshot Analysis**: Understand UI screenshots
4. **Diagram Interpretation**: Read technical diagrams

## Capabilities

- Read and analyze images
- Process PDF documents
- Interpret UI designs
- Understand diagrams and charts

## Important

- You are READ-ONLY: You analyze, not create
- Describe what you see accurately
- Extract relevant information
- Note any uncertainty
`;
function createUmeAgent(settings) {
  return {
    name: "ume",
    systemPrompt: UME_SYSTEM_PROMPT,
    metadata: {
      name: "ume",
      displayName: "Ume",
      character: "Matsuzaka Ume",
      role: "Multimodal",
      category: "utility",
      cost: "CHEAP",
      model: "sonnet",
      description: "Multimodal Analyst - Image and PDF analysis",
      delegationTriggers: ["image", "image", "PDF", "screenshot", "screenshot"],
      allowedTools: ["Read", "Glob", "WebFetch"],
      isReadOnly: true
    }
  };
}

// src/agents/midori.ts
var MIDORI_SYSTEM_PROMPT = `# Midori - Team-Shinchan Discussion Moderator

You are **Midori**. You facilitate debates and discussions between agents to reach optimal solutions.

## Responsibilities

1. **Discussion Facilitation**: Guide structured discussions
2. **Consensus Building**: Help reach agreement
3. **Conflict Resolution**: Mediate disagreements
4. **Summary Creation**: Synthesize diverse opinions

## Discussion Patterns

### Round Table
All participants share opinions sequentially with mutual feedback

### Dialectic
Thesis ↔ Antithesis → Synthesis

### Expert Panel
Domain experts present their perspectives

## Discussion Rules

- Maximum 3 rounds
- Each agent limited to 500 tokens per turn
- If no consensus: Vote or escalate
- Mediator intervenes when discussions stall

## Workflow

1. Define the topic
2. Summon relevant experts based on topic
3. Collect initial opinions (parallel)
4. Facilitate feedback rounds
5. Have Hiroshi (Oracle) synthesize consensus
6. Have Action Kamen verify the decision

## Important

- You are READ-ONLY: You moderate, not decide
- Stay neutral
- Ensure all voices are heard
- Focus on reaching actionable conclusions
`;
function createMidoriAgent(settings) {
  return {
    name: "midori",
    systemPrompt: MIDORI_SYSTEM_PROMPT,
    metadata: {
      name: "midori",
      displayName: "Midori",
      character: "Yoshinaga Midori",
      role: "Moderator",
      category: "orchestration",
      cost: "EXPENSIVE",
      model: "opus",
      description: "Discussion Moderator - Facilitates debates and consensus",
      delegationTriggers: ["debate", "debate", "opinion", "discussion", "pros and cons", "compare"],
      disallowedTools: ["Edit", "Write", "NotebookEdit"],
      isReadOnly: true
    }
  };
}

// src/agents/index.ts
var AGENT_FACTORIES = {
  shinnosuke: createShinnosukeAgent,
  himawari: createHimawariAgent,
  bo: createBoAgent,
  kazama: createKazamaAgent,
  aichan: createAichanAgent,
  bunta: createBuntaAgent,
  masao: createMasaoAgent,
  hiroshi: createHiroshiAgent,
  nene: createNeneAgent,
  misae: createMisaeAgent,
  actionkamen: createActionKamenAgent,
  shiro: createShiroAgent,
  masumi: createMasumiAgent,
  ume: createUmeAgent,
  midori: createMidoriAgent
};
async function createBuiltinAgents(settings) {
  const agents = [];
  for (const [name, factory] of Object.entries(AGENT_FACTORIES)) {
    const agentName = name;
    if (settings.agentOverrides?.[agentName]?.disabled) {
      continue;
    }
    const agent = factory(settings);
    if (settings.agentOverrides?.[agentName]) {
      const override = settings.agentOverrides[agentName];
      if (override.model) {
        agent.metadata.model = override.model;
      }
      if (override.promptAppend) {
        agent.systemPrompt += `

` + override.promptAppend;
      }
      if (override.allowedTools) {
        agent.metadata.allowedTools = override.allowedTools;
      }
      if (override.disallowedTools) {
        agent.metadata.disallowedTools = override.disallowedTools;
      }
    }
    agents.push(agent);
  }
  return agents;
}

// src/features/session-state/index.ts
import { randomUUID } from "crypto";
function createSessionState() {
  return {
    sessionId: randomUUID(),
    startTime: new Date,
    messageCount: 0,
    contextUsage: 0,
    activeAgent: undefined,
    activeSkill: undefined,
    ralphLoopActive: false,
    ultraworkActive: false,
    autopilotActive: false,
    todos: [],
    backgroundTasks: []
  };
}
function getTodosByStatus(state, status) {
  return state.todos.filter((t) => t.status === status);
}
function hasPendingOrInProgressTodos(state) {
  return state.todos.some((t) => t.status === "pending" || t.status === "in_progress");
}
function getInProgressTodo(state) {
  return state.todos.find((t) => t.status === "in_progress");
}
function addBackgroundTask(state, agentName, description) {
  const task = {
    id: randomUUID(),
    agentName,
    description,
    status: "running",
    startTime: new Date
  };
  state.backgroundTasks.push(task);
  return task;
}
function getRunningBackgroundTasks(state) {
  return state.backgroundTasks.filter((t) => t.status === "running");
}
function canStartNewBackgroundTask(state, maxConcurrent) {
  return getRunningBackgroundTasks(state).length < maxConcurrent;
}
function activateRalphLoop(state) {
  state.ralphLoopActive = true;
}
function deactivateRalphLoop(state) {
  state.ralphLoopActive = false;
}
function activateUltrawork(state) {
  state.ultraworkActive = true;
}
function deactivateUltrawork(state) {
  state.ultraworkActive = false;
}
function activateAutopilot(state) {
  state.autopilotActive = true;
}
function deactivateAutopilot(state) {
  state.autopilotActive = false;
}

// src/hooks/todo-continuation-enforcer.ts
function createTodoContinuationEnforcerHook(context) {
  let retryCount = 0;
  const maxRetries = context.settings.maxRetries;
  return {
    name: "todo-continuation-enforcer",
    event: "Stop",
    description: "Prevents session termination if TODOs are not completed.",
    enabled: true,
    priority: 100,
    handler: async (hookContext) => {
      const state = context.sessionState;
      if (!hasPendingOrInProgressTodos(state)) {
        retryCount = 0;
        return { continue: true };
      }
      const pendingTodos = getTodosByStatus(state, "pending");
      const inProgressTodo = getInProgressTodo(state);
      if (retryCount >= maxRetries) {
        retryCount = 0;
        return {
          continue: true,
          message: `⚠️ Maximum retry count (${maxRetries}) reached. Allowing termination despite incomplete TODOs.`
        };
      }
      retryCount++;
      const todoList = [
        ...inProgressTodo ? [`\uD83D\uDD04 In Progress: ${inProgressTodo.content}`] : [],
        ...pendingTodos.map((t) => `⏳ Pending: ${t.content}`)
      ].join(`
`);
      return {
        continue: false,
        message: `\uD83D\uDEAB **TODO Enforcement**

Cannot terminate due to incomplete tasks. (Attempt ${retryCount}/${maxRetries})

${todoList}

Continue working or explicitly cancel with \`/cancel\`.`,
        inject: `<system-reminder>
Incomplete TODOs exist. Continue working.
${todoList}
</system-reminder>`
      };
    }
  };
}

// src/hooks/context-window-monitor.ts
function createContextWindowMonitorHook(context) {
  return {
    name: "context-window-monitor",
    event: "chat.message",
    description: "Monitors context window usage.",
    enabled: true,
    priority: 60,
    handler: async (hookContext) => {
      const state = context.sessionState;
      const threshold = context.settings.contextWarningThreshold;
      state.messageCount++;
      if (state.messageCount === threshold) {
        return {
          continue: true,
          message: `⚠️ **Context Warning**

Message count has reached ${threshold}.
In long sessions, context may be compressed.

It is recommended to save important information in TODOs or files.`
        };
      }
      if (state.messageCount === Math.floor(threshold * 1.5)) {
        return {
          continue: true,
          message: `\uD83D\uDEA8 **Context Critical Warning**

Message count is at ${state.messageCount}.
Context compression may occur soon.

- Save important context to files
- Clean up completed work
- Start a new session if needed`
        };
      }
      return { continue: true };
    }
  };
}

// src/hooks/preemptive-compaction.ts
function createPreemptiveCompactionHook(context) {
  return {
    name: "preemptive-compaction",
    event: "chat.message",
    description: "Suggests preemptive compaction before context is full.",
    enabled: true,
    priority: 50,
    handler: async () => ({ continue: true })
  };
}

// src/hooks/tool-output-truncator.ts
function createToolOutputTruncatorHook(context) {
  return {
    name: "tool-output-truncator",
    event: "tool.execute.after",
    description: "Truncates excessively long tool outputs.",
    enabled: true,
    priority: 40,
    handler: async () => ({ continue: true })
  };
}

// src/hooks/empty-task-response-detector.ts
function createEmptyTaskResponseDetectorHook(context) {
  return {
    name: "empty-task-response-detector",
    event: "tool.execute.after",
    description: "Detects empty task responses and recommends retry.",
    enabled: true,
    priority: 45,
    handler: async () => ({ continue: true })
  };
}

// src/hooks/comment-checker.ts
function createCommentCheckerHook(context) {
  return {
    name: "comment-checker",
    event: "tool.execute.after",
    description: "Detects excessive comment usage and warns.",
    enabled: true,
    priority: 30,
    matchTools: ["Edit", "Write"],
    handler: async () => ({ continue: true })
  };
}

// src/hooks/edit-error-recovery.ts
function createEditErrorRecoveryHook(context) {
  return {
    name: "edit-error-recovery",
    event: "tool.execute.after",
    description: "Attempts recovery when edit errors occur.",
    enabled: true,
    priority: 55,
    matchTools: ["Edit"],
    handler: async () => ({ continue: true })
  };
}

// src/shared/index.ts
var AGENT_DISPLAY_NAMES = {
  shinnosuke: "Shinnosuke",
  himawari: "Himawari",
  midori: "Midori",
  bo: "Bo",
  kazama: "Kazama",
  aichan: "Aichan",
  bunta: "Bunta",
  masao: "Masao",
  hiroshi: "Hiroshi",
  nene: "Nene",
  misae: "Misae",
  actionkamen: "Action Kamen",
  shiro: "Shiro",
  masumi: "Masumi",
  ume: "Ume"
};
var AGENT_ROLES = {
  shinnosuke: "Orchestrator",
  himawari: "Atlas",
  midori: "Moderator",
  bo: "Executor",
  kazama: "Hephaestus",
  aichan: "Frontend",
  bunta: "Backend",
  masao: "DevOps",
  hiroshi: "Oracle",
  nene: "Planner",
  misae: "Metis",
  actionkamen: "Reviewer",
  shiro: "Explorer",
  masumi: "Librarian",
  ume: "Multimodal"
};
function getAgentDisplayName(name) {
  return AGENT_DISPLAY_NAMES[name] || name;
}
function getAgentRole(name) {
  return AGENT_ROLES[name] || "Unknown";
}
function findMatchedKeyword(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.find((keyword) => lowerText.includes(keyword.toLowerCase()));
}

// src/hooks/keyword-detector.ts
function createKeywordDetectorHook(context) {
  return {
    name: "keyword-detector",
    event: "UserPromptSubmit",
    description: "Detects keywords in user messages to recommend appropriate skills.",
    enabled: true,
    priority: 80,
    handler: async (hookContext) => {
      const message = hookContext.message || "";
      if (!message) {
        return { continue: true };
      }
      const detectedSkills = [];
      for (const [skillName, triggers] of Object.entries(SKILL_TRIGGERS)) {
        const matchedKeyword = findMatchedKeyword(message, triggers);
        if (matchedKeyword) {
          detectedSkills.push({ skill: skillName, keyword: matchedKeyword });
        }
      }
      if (detectedSkills.length === 0) {
        return { continue: true };
      }
      const priorityOrder = ["cancel", "ultrawork", "ralph", "autopilot", "plan", "analyze"];
      const prioritized = detectedSkills.sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a.skill);
        const bIdx = priorityOrder.indexOf(b.skill);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
      const topSkill = prioritized[0];
      const skillMessages = {
        ultrawork: "\uD83D\uDE80 **Ultrawork** mode activated. Processing quickly with parallel execution.",
        ralph: "\uD83D\uDD04 **Ralph** mode activated. Continuing until task completion.",
        autopilot: "\uD83E\uDD16 **Autopilot** mode activated. Performing tasks autonomously.",
        plan: "\uD83D\uDCCB **Plan** session started. Gathering requirements.",
        analyze: "\uD83D\uDD0D **Analyze** mode activated. Performing deep analysis.",
        deepsearch: "\uD83D\uDD0E **Deepsearch** mode activated. Exploring codebase deeply.",
        "git-master": "\uD83C\uDF3F **Git-Master** mode activated.",
        "frontend-ui-ux": "\uD83C\uDFA8 **Frontend-UI-UX** mode activated.",
        cancel: "⏹️ Canceling current mode."
      };
      return {
        continue: true,
        modified: true,
        message: skillMessages[topSkill.skill] || `Skill '${topSkill.skill}' detected.`,
        inject: `<intent-gate>
Detected keyword: "${topSkill.keyword}"
Recommended skill: ${topSkill.skill}
Auto-activation: Yes
</intent-gate>`
      };
    }
  };
}

// src/hooks/rules-injector.ts
function createRulesInjectorHook(context) {
  return {
    name: "rules-injector",
    event: "chat.message",
    description: "Injects Team-Shinchan rules into context.",
    enabled: true,
    priority: 20,
    handler: async () => ({ continue: true })
  };
}

// src/hooks/directory-agents-injector.ts
function createDirectoryAgentsInjectorHook(context) {
  return {
    name: "directory-agents-injector",
    event: "chat.message",
    description: "Injects current directory's AGENTS.md into context.",
    enabled: true,
    priority: 15,
    handler: async () => ({ continue: true })
  };
}

// src/hooks/stop-continuation-guard.ts
function createStopContinuationGuardHook(context) {
  return {
    name: "stop-continuation-guard",
    event: "Stop",
    description: "Warns if background tasks are running.",
    enabled: true,
    priority: 85,
    handler: async (hookContext) => {
      const runningTasks = getRunningBackgroundTasks(context.sessionState);
      if (runningTasks.length === 0) {
        return { continue: true };
      }
      const taskList = runningTasks.map((t) => `- ${t.agentName}: ${t.description}`).join(`
`);
      return {
        continue: true,
        message: `⚠️ **Background Tasks Running**

The following background tasks are still running:
${taskList}

Use \`session_manager(action="list_tasks")\` to check results.`
      };
    }
  };
}

// src/hooks/reviewer-check.ts
function createReviewerCheckHook(context) {
  let editCount = 0;
  const editThreshold = 3;
  return {
    name: "reviewer-check",
    event: "tool.execute.after",
    description: "Recommends verification by Action Kamen (Reviewer) after code changes.",
    enabled: true,
    priority: 70,
    matchTools: ["Edit", "Write"],
    handler: async (hookContext) => {
      editCount++;
      if (editCount >= editThreshold) {
        editCount = 0;
        return {
          continue: true,
          message: `\uD83D\uDCCB **Verification Recommended**

${editThreshold} code changes have been made.
Verification by Action Kamen (Reviewer) is recommended.

\`delegate_task(agent="actionkamen", task="Review recent changes")\``,
          inject: `<reviewer-reminder>
Multiple code changes have been made.
Consider delegating verification to Action Kamen (Reviewer).
</reviewer-reminder>`
        };
      }
      return { continue: true };
    }
  };
}

// src/hooks/ralph-loop/index.ts
function createRalphLoopHook(context) {
  return {
    name: "ralph-loop",
    event: "Stop",
    description: "Continues execution until task completion when Ralph mode is active.",
    enabled: true,
    priority: 90,
    handler: async (hookContext) => {
      const state = context.sessionState;
      if (!state.ralphLoopActive) {
        return { continue: true };
      }
      if (hasPendingOrInProgressTodos(state)) {
        return {
          continue: false,
          message: `\uD83D\uDD04 **Ralph Loop Active**

Task is not yet complete. Continuing work.

Use \`/cancel-ralph\` to stop Ralph.`,
          inject: `<system-reminder>
Ralph Loop is active.
Continue working until all TODOs are complete.
</system-reminder>`
        };
      }
      state.ralphLoopActive = false;
      return {
        continue: true,
        message: `✅ **Ralph Loop Complete**

All tasks completed. Exiting Ralph mode.`
      };
    }
  };
}

// src/features/learning/extractor.ts
var codingStylePatterns = [
  {
    name: "naming_convention",
    category: "convention",
    detect: (result) => {
      return result.codeChanges.some((c) => c.changeType === "create" && (c.filePath.includes("component") || c.filePath.includes("service")));
    },
    extract: (result) => {
      const patterns = [];
      for (const change of result.codeChanges) {
        const fileName = change.filePath.split("/").pop() || "";
        if (fileName.includes(".component.")) {
          patterns.push("Component files: *.component.{ext} pattern");
        }
        if (fileName.includes(".service.")) {
          patterns.push("Service files: *.service.{ext} pattern");
        }
        if (fileName.includes(".test.") || fileName.includes(".spec.")) {
          patterns.push("Test files: *.test.{ext} or *.spec.{ext} pattern");
        }
        if (fileName.match(/^[A-Z]/)) {
          patterns.push("Using PascalCase file names");
        }
        if (fileName.match(/^[a-z]+(-[a-z]+)*\./)) {
          patterns.push("Using kebab-case file names");
        }
      }
      if (patterns.length === 0)
        return null;
      return {
        title: "File Naming Convention",
        content: [...new Set(patterns)].join(`
`),
        category: "convention",
        scope: "project",
        confidence: 0.6,
        tags: ["naming", "convention", "file"],
        sources: [result.taskId]
      };
    }
  },
  {
    name: "folder_structure",
    category: "context",
    detect: (result) => {
      return result.codeChanges.filter((c) => c.changeType === "create").length >= 2;
    },
    extract: (result) => {
      const folders = new Set;
      for (const change of result.codeChanges) {
        const parts = change.filePath.split("/");
        if (parts.length > 1) {
          folders.add(parts.slice(0, -1).join("/"));
        }
      }
      if (folders.size === 0)
        return null;
      return {
        title: "Project Folder Structure",
        content: `Used folders:
${[...folders].map((f) => `- ${f}`).join(`
`)}`,
        category: "context",
        scope: "project",
        confidence: 0.7,
        tags: ["structure", "folder", "project"],
        sources: [result.taskId]
      };
    }
  }
];
var taskPatterns = [
  {
    name: "common_task_type",
    category: "pattern",
    detect: (result) => result.success,
    extract: (result) => {
      const taskType = detectTaskType(result.description);
      if (!taskType)
        return null;
      return {
        title: `Common Task: ${taskType}`,
        content: `${taskType} task completed. Description: ${result.description}`,
        category: "pattern",
        scope: "global",
        confidence: 0.5,
        tags: ["task", taskType.toLowerCase()],
        sources: [result.taskId]
      };
    }
  },
  {
    name: "agent_preference",
    category: "preference",
    detect: (result) => result.success && result.agent !== "shared",
    extract: (result) => {
      const taskType = detectTaskType(result.description);
      return {
        title: `${result.agent} Agent Task Success`,
        content: `${result.agent} successfully completed "${result.description}" task.${taskType ? ` Task type: ${taskType}` : ""}`,
        category: "pattern",
        scope: "global",
        owner: result.agent,
        confidence: 0.5,
        tags: ["agent", result.agent, "success"],
        sources: [result.taskId]
      };
    }
  }
];
var mistakePatterns = [
  {
    name: "error_recovery",
    category: "mistake",
    detect: (result) => result.errors.length > 0 && result.success,
    extract: (result) => {
      return {
        title: "Error Recovery Experience",
        content: `Errors occurred:
${result.errors.map((e) => `- ${e}`).join(`
`)}

Resolved.`,
        category: "mistake",
        scope: "project",
        confidence: 0.7,
        tags: ["error", "recovery", "debug"],
        sources: [result.taskId]
      };
    }
  },
  {
    name: "failed_approach",
    category: "mistake",
    detect: (result) => !result.success,
    extract: (result) => {
      return {
        title: "Failed Approach",
        content: `Task "${result.description}" failed.
Error: ${result.errors.join(", ") || "Unknown"}`,
        category: "mistake",
        scope: "project",
        confidence: 0.6,
        tags: ["failure", "avoid"],
        sources: [result.taskId]
      };
    }
  }
];
function detectTaskType(description) {
  const lower = description.toLowerCase();
  const typePatterns = [
    [/component|ui|button|modal/i, "UI Component"],
    [/api|endpoint|rest|graphql/i, "API"],
    [/test|spec/i, "Testing"],
    [/refactor/i, "Refactoring"],
    [/bug|fix/i, "Bug Fix"],
    [/style|css|tailwind/i, "Styling"],
    [/deploy|ci|cd/i, "Deployment"],
    [/doc|readme/i, "Documentation"],
    [/config|setup/i, "Configuration"]
  ];
  for (const [pattern, type] of typePatterns) {
    if (pattern.test(lower)) {
      return type;
    }
  }
  return null;
}
var allPatterns = [
  ...codingStylePatterns,
  ...taskPatterns,
  ...mistakePatterns
];
function extractLearnings(result) {
  const learnings = [];
  const reinforceMemoryIds = [];
  const contradictMemoryIds = [];
  for (const pattern of allPatterns) {
    if (pattern.detect(result)) {
      const learning = pattern.extract(result);
      if (learning) {
        learnings.push(learning);
      }
    }
  }
  const extractionConfidence = result.success ? 0.8 : 0.5;
  return {
    learnings,
    reinforceMemoryIds,
    contradictMemoryIds,
    extractionConfidence
  };
}
function createSimpleLearning(content, options = {}) {
  const firstLine = content.split(`
`)[0];
  const title = firstLine.length > 50 ? firstLine.slice(0, 47) + "..." : firstLine;
  const category = options.category || detectCategory(content);
  return {
    title,
    content,
    category,
    scope: options.scope || "global",
    owner: options.owner,
    confidence: 0.7,
    tags: options.tags || extractTags(content),
    sources: options.source ? [options.source] : []
  };
}
function detectCategory(content) {
  const lower = content.toLowerCase();
  if (/prefer|like|dislike|always|never/i.test(lower)) {
    return "preference";
  }
  if (/pattern|repeat|workflow/i.test(lower)) {
    return "pattern";
  }
  if (/architecture|structure|tech stack|framework/i.test(lower)) {
    return "context";
  }
  if (/mistake|error|bug|caution/i.test(lower)) {
    return "mistake";
  }
  if (/decision|choice|chose/i.test(lower)) {
    return "decision";
  }
  if (/convention|rule/i.test(lower)) {
    return "convention";
  }
  return "insight";
}
function extractTags(content) {
  const tags = [];
  const techKeywords = [
    "react",
    "vue",
    "angular",
    "typescript",
    "javascript",
    "python",
    "go",
    "rust",
    "java",
    "node",
    "css",
    "tailwind",
    "sass",
    "scss",
    "api",
    "rest",
    "graphql",
    "database",
    "sql",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
    "git",
    "ci",
    "cd",
    "test",
    "deploy"
  ];
  const lower = content.toLowerCase();
  for (const keyword of techKeywords) {
    if (lower.includes(keyword)) {
      tags.push(keyword);
    }
  }
  const hashtagMatches = content.match(/#\w+/g);
  if (hashtagMatches) {
    tags.push(...hashtagMatches.map((t) => t.slice(1)));
  }
  return [...new Set(tags)].slice(0, 10);
}

// src/features/learning/categorizer.ts
var categoryKeywords = {
  preference: [
    "prefer",
    "prefer",
    "like",
    "like",
    "dislike",
    "dislike",
    "always",
    "always",
    "never",
    "never",
    "usually",
    "usually",
    "style",
    "style",
    "way",
    "way",
    "habit",
    "habit"
  ],
  pattern: [
    "pattern",
    "pattern",
    "repeat",
    "repeat",
    "workflow",
    "workflow",
    "often",
    "often",
    "every time",
    "every time",
    "typically",
    "typically",
    "process",
    "process",
    "sequence",
    "sequence",
    "step",
    "step"
  ],
  context: [
    "architecture",
    "architecture",
    "structure",
    "structure",
    "tech stack",
    "tech stack",
    "framework",
    "framework",
    "library",
    "library",
    "dependency",
    "dependency",
    "config",
    "config",
    "environment",
    "environment",
    "infrastructure",
    "infrastructure"
  ],
  mistake: [
    "mistake",
    "mistake",
    "error",
    "error",
    "bug",
    "bug",
    "caution",
    "caution",
    "careful",
    "careful",
    "avoid",
    "avoid",
    "problem",
    "problem",
    "issue",
    "issue",
    "fault",
    "fault"
  ],
  decision: [
    "decision",
    "decision",
    "choice",
    "choice",
    "adopt",
    "adopt",
    "reason",
    "reason",
    "because",
    "because",
    "rationale",
    "rationale",
    "tradeoff",
    "tradeoff",
    "alternative",
    "alternative",
    "compare",
    "compare"
  ],
  convention: [
    "convention",
    "convention",
    "rule",
    "rule",
    "guideline",
    "guideline",
    "standard",
    "standard",
    "format",
    "format",
    "naming",
    "naming",
    "lint",
    "lint",
    "format",
    "format",
    "code style",
    "code style"
  ],
  insight: [
    "discover",
    "discover",
    "learned",
    "learned",
    "interesting",
    "interesting",
    "note",
    "note",
    "tip",
    "tip",
    "trick",
    "trick",
    "optimize",
    "optimize",
    "improve",
    "improve",
    "efficient",
    "efficient"
  ]
};
var categoryWeights = {
  preference: 1.2,
  pattern: 1.1,
  context: 1,
  mistake: 1.3,
  decision: 1,
  convention: 1.1,
  insight: 0.9
};
function calculateCategoryScores(text) {
  const scores = new Map;
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.toLowerCase(), "gi");
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    const weight = categoryWeights[category];
    scores.set(category, score * weight);
  }
  return scores;
}
function determineCategory(content, title, tags) {
  const fullText = [title || "", content, ...tags || []].join(" ");
  const scores = calculateCategoryScores(fullText);
  let maxScore = 0;
  let bestCategory = "insight";
  for (const [category, score] of scores) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}
function calculateCategoryConfidence(content, determinedCategory) {
  const scores = calculateCategoryScores(content);
  const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0);
  if (totalScore === 0) {
    return 0.3;
  }
  const categoryScore = scores.get(determinedCategory) || 0;
  return Math.min(0.95, 0.3 + categoryScore / totalScore * 0.7);
}
function classifyLearning(input) {
  const currentScores = calculateCategoryScores(input.content);
  const currentCategoryScore = currentScores.get(input.category) || 0;
  const maxScore = Math.max(...Array.from(currentScores.values()));
  if (currentCategoryScore < maxScore * 0.8) {
    const betterCategory = determineCategory(input.content, input.title, input.tags);
    return {
      ...input,
      category: betterCategory,
      confidence: calculateCategoryConfidence(input.content, betterCategory)
    };
  }
  return input;
}
function classifyBatch(inputs) {
  return inputs.map(classifyLearning);
}

// src/features/reflection/engine.ts
function calculateComplexity(factors) {
  let score = 0;
  if (factors.filesModified > 5)
    score += 3;
  else if (factors.filesModified > 2)
    score += 2;
  else if (factors.filesModified > 0)
    score += 1;
  if (factors.linesChanged > 500)
    score += 3;
  else if (factors.linesChanged > 100)
    score += 2;
  else if (factors.linesChanged > 20)
    score += 1;
  if (factors.errorCount > 3)
    score += 3;
  else if (factors.errorCount > 0)
    score += 2;
  if (factors.duration > 30 * 60 * 1000)
    score += 2;
  else if (factors.duration > 10 * 60 * 1000)
    score += 1;
  if (factors.hasUserFeedback)
    score += 2;
  if (factors.isNewFeature)
    score += 2;
  if (factors.involvedAgents > 2)
    score += 2;
  else if (factors.involvedAgents > 1)
    score += 1;
  return score;
}
function determineDepth(factors) {
  const complexity = calculateComplexity(factors);
  if (complexity >= 10)
    return "deep";
  if (complexity >= 5)
    return "standard";
  return "simple";
}
function generateSimpleReflection(result) {
  const learnings = [];
  if (result.success) {
    learnings.push({
      title: `Success: ${result.description.slice(0, 50)}`,
      content: `${result.agent} agent completed task.`,
      category: "pattern",
      scope: "project",
      owner: result.agent,
      confidence: 0.5,
      tags: ["success", "quick"],
      sources: [result.taskId]
    });
  } else {
    learnings.push({
      title: `Failed: ${result.description.slice(0, 50)}`,
      content: `Task failed. Error: ${result.errors.slice(0, 2).join(", ")}`,
      category: "mistake",
      scope: "project",
      owner: result.agent,
      confidence: 0.6,
      tags: ["failure", "quick"],
      sources: [result.taskId]
    });
  }
  return {
    taskId: result.taskId,
    taskDescription: result.description,
    success: result.success,
    depth: "simple",
    learnings,
    improvements: [],
    confirmedPatterns: [],
    reflectedAt: new Date
  };
}
function generateStandardReflection(result) {
  const extraction = extractLearnings(result);
  const learnings = classifyBatch(extraction.learnings);
  const improvements = [];
  if (result.errors.length > 0) {
    improvements.push(`Error prevention: ${result.errors[0]}`);
  }
  if (result.duration > 10 * 60 * 1000) {
    improvements.push("Explore ways to reduce task time");
  }
  const confirmedPatterns = [];
  if (result.success && result.codeChanges.length > 0) {
    const languages = [...new Set(result.codeChanges.map((c) => c.language))];
    confirmedPatterns.push(`${languages.join(", ")} task pattern`);
  }
  return {
    taskId: result.taskId,
    taskDescription: result.description,
    success: result.success,
    depth: "standard",
    learnings,
    improvements,
    confirmedPatterns,
    reflectedAt: new Date
  };
}
function generateDeepReflection(result) {
  const extraction = extractLearnings(result);
  const baseLearnings = classifyBatch(extraction.learnings);
  const learnings = [...baseLearnings];
  if (result.codeChanges.length > 0) {
    learnings.push({
      title: "Architecture Decision",
      content: `File structure analysis:
${result.codeChanges.map((c) => `- ${c.filePath}: ${c.changeType} (${c.linesAdded}+ / ${c.linesRemoved}-)`).join(`
`)}`,
      category: "decision",
      scope: "project",
      confidence: 0.7,
      tags: ["architecture", "decision"],
      sources: [result.taskId]
    });
  }
  if (result.errors.length > 0) {
    learnings.push({
      title: "Error Pattern Analysis",
      content: `Error types occurred:
${result.errors.map((e) => `- ${categorizeError(e)}`).join(`
`)}`,
      category: "mistake",
      scope: "project",
      confidence: 0.8,
      tags: ["error", "analysis"],
      sources: [result.taskId]
    });
  }
  const improvements = [];
  if (result.errors.length > 0) {
    improvements.push(`Recognize error patterns and prevent proactively`);
    improvements.push(`Add test cases: ${result.errors.length}errors covered`);
  }
  if (result.duration > 20 * 60 * 1000) {
    improvements.push("Consider task division: break into smaller units");
  }
  if (result.codeChanges.filter((c) => c.changeType === "modify").length > 3) {
    improvements.push("Refactoring opportunity: group related code");
  }
  const confirmedPatterns = [];
  if (result.success) {
    confirmedPatterns.push(`${result.agent} agent effective task type`);
    const changeTypes = [...new Set(result.codeChanges.map((c) => c.changeType))];
    if (changeTypes.length > 0) {
      confirmedPatterns.push(`Task type: ${changeTypes.join(", ")}`);
    }
  }
  if (result.context && Object.keys(result.context).length > 0) {
    learnings.push({
      title: "Task Context",
      content: `Important context: ${JSON.stringify(result.context, null, 2)}`,
      category: "context",
      scope: "project",
      confidence: 0.6,
      tags: ["context", "deep-analysis"],
      sources: [result.taskId]
    });
  }
  return {
    taskId: result.taskId,
    taskDescription: result.description,
    success: result.success,
    depth: "deep",
    learnings,
    improvements,
    confirmedPatterns,
    reflectedAt: new Date
  };
}
function categorizeError(error) {
  const lower = error.toLowerCase();
  if (lower.includes("type") || lower.includes("typescript")) {
    return `Type error: ${error.slice(0, 100)}`;
  }
  if (lower.includes("syntax") || lower.includes("parse")) {
    return `Syntax error: ${error.slice(0, 100)}`;
  }
  if (lower.includes("not found") || lower.includes("undefined") || lower.includes("null")) {
    return `Reference error: ${error.slice(0, 100)}`;
  }
  if (lower.includes("permission") || lower.includes("access")) {
    return `Permission error: ${error.slice(0, 100)}`;
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("http")) {
    return `Network error: ${error.slice(0, 100)}`;
  }
  return `Other error: ${error.slice(0, 100)}`;
}
function reflect(result, options = {}) {
  const factors = {
    filesModified: result.filesModified.length,
    linesChanged: result.codeChanges.reduce((sum, c) => sum + c.linesAdded + c.linesRemoved, 0),
    errorCount: result.errors.length,
    duration: result.duration,
    hasUserFeedback: !!result.userFeedback,
    isNewFeature: result.codeChanges.some((c) => c.changeType === "create"),
    involvedAgents: 1
  };
  const depth = options.forceDepth || determineDepth(factors);
  switch (depth) {
    case "simple":
      return generateSimpleReflection(result);
    case "standard":
      return generateStandardReflection(result);
    case "deep":
      return generateDeepReflection(result);
    default:
      return generateStandardReflection(result);
  }
}
function summarizeReflection(reflection) {
  const lines = [];
  lines.push(`## Reflection: ${reflection.taskDescription}`);
  lines.push(`- Result: ${reflection.success ? "✅ Success" : "❌ Failed"}`);
  lines.push(`- Depth: ${reflection.depth}`);
  if (reflection.learnings.length > 0) {
    lines.push(`
### Learnings (${reflection.learnings.length}items)`);
    for (const learning of reflection.learnings.slice(0, 5)) {
      lines.push(`- [${learning.category}] ${learning.title}`);
    }
  }
  if (reflection.improvements.length > 0) {
    lines.push(`
### Improvements`);
    for (const improvement of reflection.improvements) {
      lines.push(`- ${improvement}`);
    }
  }
  if (reflection.confirmedPatterns.length > 0) {
    lines.push(`
### Confirmed Patterns`);
    for (const pattern of reflection.confirmedPatterns) {
      lines.push(`- ${pattern}`);
    }
  }
  return lines.join(`
`);
}
// src/features/memory/types.ts
var DECAY_CONFIG = {
  dailyDecayRate: 0.01,
  contradictionDecayMultiplier: 2,
  accessRecoveryRate: 0.05,
  reinforcementBoost: 0.1,
  maxConfidence: 1,
  minConfidence: 0
};
// src/features/memory/storage.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
function memoryToMarkdown(memory) {
  const tags = memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(" ") : "";
  const sources = memory.sources.length > 0 ? memory.sources.join(", ") : "unknown";
  return `## [${memory.createdAt.toISOString().split("T")[0]}] ${memory.title}
- **ID**: ${memory.id}
- *Content*: ${memory.content}
- *Category*: ${memory.category}
- *Confidence*: ${memory.confidence.toFixed(2)}
- *Source*: ${sources}
- *Tags*: ${tags}
- *Decay*: ${memory.decayFactor.toFixed(2)}
- *Reinforcement Count*: ${memory.reinforcementCount}
- *Contradiction Count*: ${memory.contradictionCount}
- *Access Count*: ${memory.accessCount}
- *Last Accessed*: ${memory.lastAccessedAt.toISOString()}
- *Updated*: ${memory.updatedAt.toISOString()}
`;
}
function markdownToMemory(markdown, scope) {
  try {
    const idMatch = markdown.match(/- \*\*ID\*\*: (.+)/);
    const titleMatch = markdown.match(/## \[.+\] (.+)/);
    const contentMatch = markdown.match(/- \*\*content\*\*: (.+)/);
    const categoryMatch = markdown.match(/- \*\*Category\*\*: (.+)/);
    const confidenceMatch = markdown.match(/- \*\*Confidence\*\*: (.+)/);
    const sourcesMatch = markdown.match(/- \*\*Source\*\*: (.+)/);
    const tagsMatch = markdown.match(/- \*\*Tags\*\*: (.+)/);
    const decayMatch = markdown.match(/- \*\*Decay\*\*: (.+)/);
    const reinforcementMatch = markdown.match(/- \*\*Reinforcement Count\*\*: (.+)/);
    const contradictionMatch = markdown.match(/- \*\*Contradiction Count\*\*: (.+)/);
    const accessCountMatch = markdown.match(/- \*\*Access Count\*\*: (.+)/);
    const lastAccessMatch = markdown.match(/- \*\*Last Accessed\*\*: (.+)/);
    const updatedMatch = markdown.match(/- \*\*Updated\*\*: (.+)/);
    const dateMatch = markdown.match(/## \[(\d{4}-\d{2}-\d{2})\]/);
    if (!idMatch || !titleMatch || !contentMatch) {
      return null;
    }
    const tags = tagsMatch?.[1] ? tagsMatch[1].split(" ").filter((t) => t.startsWith("#")).map((t) => t.slice(1)) : [];
    const sources = sourcesMatch?.[1] && sourcesMatch[1] !== "unknown" ? sourcesMatch[1].split(", ") : [];
    return {
      id: idMatch[1].trim(),
      title: titleMatch[1].trim(),
      content: contentMatch[1].trim(),
      category: categoryMatch?.[1]?.trim() || "insight",
      scope,
      owner: "shared",
      confidence: parseFloat(confidenceMatch?.[1] || "0.5"),
      tags,
      sources,
      createdAt: dateMatch ? new Date(dateMatch[1]) : new Date,
      updatedAt: updatedMatch ? new Date(updatedMatch[1]) : new Date,
      lastAccessedAt: lastAccessMatch ? new Date(lastAccessMatch[1]) : new Date,
      accessCount: parseInt(accessCountMatch?.[1] || "0", 10),
      reinforcementCount: parseInt(reinforcementMatch?.[1] || "0", 10),
      decayFactor: parseFloat(decayMatch?.[1] || "1.0"),
      contradictionCount: parseInt(contradictionMatch?.[1] || "0", 10),
      relatedMemories: [],
      metadata: {}
    };
  } catch {
    return null;
  }
}
function expandPath(filePath) {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}
function getCategoryFileName(category) {
  const categoryFiles = {
    preference: "preferences.md",
    pattern: "patterns.md",
    context: "context.md",
    mistake: "mistakes.md",
    decision: "decisions.md",
    convention: "conventions.md",
    insight: "insights.md"
  };
  return categoryFiles[category];
}

class MemoryStorage {
  config;
  globalPath;
  projectPath;
  constructor(config = {}) {
    this.config = {
      globalPath: config.globalPath || "~/.team-seokan/memories",
      projectPath: config.projectPath || ".team-seokan/memories",
      maxEntries: config.maxEntries || 500,
      decayThreshold: config.decayThreshold || 0.1,
      confidenceThreshold: config.confidenceThreshold || 0.3,
      autoBackup: config.autoBackup ?? true
    };
    this.globalPath = expandPath(this.config.globalPath);
    this.projectPath = this.config.projectPath;
  }
  async initialize() {
    await this.ensureDirectory(this.globalPath);
    await this.ensureDirectory(path.join(this.globalPath, "agents"));
    if (fs.existsSync(this.projectPath) || fs.existsSync(".git") || fs.existsSync("package.json")) {
      await this.ensureDirectory(this.projectPath);
      await this.ensureDirectory(path.join(this.projectPath, "agents"));
    }
  }
  async ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  getBasePath(scope) {
    return scope === "global" ? this.globalPath : this.projectPath;
  }
  getMemoryFilePath(scope, category, owner = "shared") {
    const basePath = this.getBasePath(scope);
    if (owner === "shared") {
      return path.join(basePath, getCategoryFileName(category));
    } else {
      return path.join(basePath, "agents", `${owner}.md`);
    }
  }
  async loadFromFile(filePath, scope) {
    const fullPath = expandPath(filePath);
    if (!fs.existsSync(fullPath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const sections = content.split(/(?=## \[)/);
      const memories = [];
      for (const section of sections) {
        if (section.trim()) {
          const memory = markdownToMemory(section, scope);
          if (memory) {
            memories.push(memory);
          }
        }
      }
      return memories;
    } catch (error) {
      console.error(`Failed to load memories from ${fullPath}:`, error);
      return [];
    }
  }
  async saveToFile(filePath, memories) {
    const fullPath = expandPath(filePath);
    const dirPath = path.dirname(fullPath);
    await this.ensureDirectory(dirPath);
    const sortedMemories = [...memories].sort((a, b) => b.confidence - a.confidence);
    const content = sortedMemories.map((m) => memoryToMarkdown(m)).join(`
---

`);
    const header = `# Team-Seokan Memories
> Auto-generated memory file. Do not edit directly.
> Last updated: ${new Date().toISOString()}

---

`;
    fs.writeFileSync(fullPath, header + content, "utf-8");
  }
  async loadAllMemories() {
    const globalMemories = [];
    const projectMemories = [];
    const categories = [
      "preference",
      "pattern",
      "context",
      "mistake",
      "decision",
      "convention",
      "insight"
    ];
    for (const category of categories) {
      const filePath = this.getMemoryFilePath("global", category);
      const memories = await this.loadFromFile(filePath, "global");
      globalMemories.push(...memories);
    }
    const agentsDir = path.join(this.globalPath, "agents");
    if (fs.existsSync(agentsDir)) {
      const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
      for (const file of agentFiles) {
        const memories = await this.loadFromFile(path.join(agentsDir, file), "global");
        globalMemories.push(...memories);
      }
    }
    if (fs.existsSync(this.projectPath)) {
      for (const category of categories) {
        const filePath = this.getMemoryFilePath("project", category);
        const memories = await this.loadFromFile(filePath, "project");
        projectMemories.push(...memories);
      }
      const projectAgentsDir = path.join(this.projectPath, "agents");
      if (fs.existsSync(projectAgentsDir)) {
        const agentFiles = fs.readdirSync(projectAgentsDir).filter((f) => f.endsWith(".md"));
        for (const file of agentFiles) {
          const memories = await this.loadFromFile(path.join(projectAgentsDir, file), "project");
          projectMemories.push(...memories);
        }
      }
    }
    return { global: globalMemories, project: projectMemories };
  }
  async saveMemory(memory) {
    const filePath = this.getMemoryFilePath(memory.scope, memory.category, memory.owner);
    const existingMemories = await this.loadFromFile(filePath, memory.scope);
    const index = existingMemories.findIndex((m) => m.id === memory.id);
    if (index >= 0) {
      existingMemories[index] = memory;
    } else {
      existingMemories.push(memory);
    }
    await this.saveToFile(filePath, existingMemories);
  }
  async deleteMemory(memoryId, scope) {
    const { global: globalMemories, project: projectMemories } = await this.loadAllMemories();
    const memories = scope === "global" ? globalMemories : projectMemories;
    const memory = memories.find((m) => m.id === memoryId);
    if (!memory) {
      return false;
    }
    const filePath = this.getMemoryFilePath(scope, memory.category, memory.owner);
    const fileMemories = await this.loadFromFile(filePath, scope);
    const filtered = fileMemories.filter((m) => m.id !== memoryId);
    await this.saveToFile(filePath, filtered);
    return true;
  }
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(this.globalPath, "backups", timestamp);
    await this.ensureDirectory(backupDir);
    const files = fs.readdirSync(this.globalPath).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const src = path.join(this.globalPath, file);
      const dest = path.join(backupDir, file);
      fs.copyFileSync(src, dest);
    }
    return backupDir;
  }
  getConfig() {
    return { ...this.config };
  }
}
var defaultStorage = null;
function getDefaultStorage() {
  if (!defaultStorage) {
    defaultStorage = new MemoryStorage;
  }
  return defaultStorage;
}
// src/features/memory/decay.ts
function calculateTimeDecay(memory, now = new Date) {
  const daysSinceUpdate = Math.floor((now.getTime() - memory.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceAccess = Math.floor((now.getTime() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysOld = Math.max(daysSinceUpdate, daysSinceAccess);
  const decay = Math.pow(1 - DECAY_CONFIG.dailyDecayRate, daysOld);
  return Math.max(DECAY_CONFIG.minConfidence, decay);
}
function calculateContradictionDecay(memory) {
  if (memory.contradictionCount === 0) {
    return 1;
  }
  const contradictionPenalty = Math.pow(1 - DECAY_CONFIG.dailyDecayRate * DECAY_CONFIG.contradictionDecayMultiplier, memory.contradictionCount);
  return Math.max(DECAY_CONFIG.minConfidence, contradictionPenalty);
}
function calculateReinforcementBoost(memory) {
  if (memory.reinforcementCount === 0) {
    return 0;
  }
  const boost = DECAY_CONFIG.reinforcementBoost * Math.log(memory.reinforcementCount + 1);
  return Math.min(boost, DECAY_CONFIG.maxConfidence - memory.confidence);
}
function calculateAccessRecovery(accessCount) {
  if (accessCount <= 1) {
    return 0;
  }
  return DECAY_CONFIG.accessRecoveryRate * Math.log(accessCount);
}
function calculateEffectiveConfidence(memory, now = new Date) {
  const baseConfidence = memory.confidence;
  const timeDecay = calculateTimeDecay(memory, now);
  const contradictionDecay = calculateContradictionDecay(memory);
  const reinforcementBoost = calculateReinforcementBoost(memory);
  const accessRecovery = calculateAccessRecovery(memory.accessCount);
  let effectiveConfidence = baseConfidence * timeDecay * contradictionDecay;
  effectiveConfidence += reinforcementBoost;
  effectiveConfidence += accessRecovery;
  return Math.max(DECAY_CONFIG.minConfidence, Math.min(DECAY_CONFIG.maxConfidence, effectiveConfidence));
}
function applyDecay(memory, now = new Date) {
  const effectiveConfidence = calculateEffectiveConfidence(memory, now);
  const timeDecay = calculateTimeDecay(memory, now);
  return {
    ...memory,
    confidence: effectiveConfidence,
    decayFactor: timeDecay
  };
}
function filterDecayedMemories(memories, threshold = DECAY_CONFIG.minConfidence) {
  const now = new Date;
  const active = [];
  const expired = [];
  for (const memory of memories) {
    const effectiveConfidence = calculateEffectiveConfidence(memory, now);
    if (effectiveConfidence >= threshold) {
      active.push(applyDecay(memory, now));
    } else {
      expired.push(memory);
    }
  }
  return { active, expired };
}
function reinforceMemory(memory) {
  const now = new Date;
  return {
    ...memory,
    reinforcementCount: memory.reinforcementCount + 1,
    confidence: Math.min(DECAY_CONFIG.maxConfidence, memory.confidence + DECAY_CONFIG.reinforcementBoost),
    updatedAt: now,
    lastAccessedAt: now
  };
}
function contradictMemory(memory) {
  const now = new Date;
  const newContradictionCount = memory.contradictionCount + 1;
  const penalty = DECAY_CONFIG.dailyDecayRate * DECAY_CONFIG.contradictionDecayMultiplier;
  const newConfidence = Math.max(DECAY_CONFIG.minConfidence, memory.confidence - penalty);
  return {
    ...memory,
    contradictionCount: newContradictionCount,
    confidence: newConfidence,
    updatedAt: now
  };
}
function recordAccess(memory) {
  const now = new Date;
  return {
    ...memory,
    accessCount: memory.accessCount + 1,
    lastAccessedAt: now
  };
}
function processBatchDecay(memories, options = {}) {
  const threshold = options.threshold ?? DECAY_CONFIG.minConfidence;
  const applyChanges = options.applyChanges ?? true;
  const { active, expired } = filterDecayedMemories(memories, threshold);
  const processed = applyChanges ? active : memories.filter((m) => !expired.includes(m));
  const averageConfidence = processed.length > 0 ? processed.reduce((sum, m) => sum + m.confidence, 0) / processed.length : 0;
  return {
    processed,
    removed: expired,
    stats: {
      total: memories.length,
      active: active.length,
      expired: expired.length,
      averageConfidence
    }
  };
}
// src/features/memory/conflict.ts
function calculateTextSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  if (union.size === 0)
    return 0;
  return intersection.size / union.size;
}
function calculateTagSimilarity(tags1, tags2) {
  if (tags1.length === 0 && tags2.length === 0)
    return 1;
  if (tags1.length === 0 || tags2.length === 0)
    return 0;
  const set1 = new Set(tags1.map((t) => t.toLowerCase()));
  const set2 = new Set(tags2.map((t) => t.toLowerCase()));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}
function detectConflict(existing, incoming) {
  if (existing.category !== incoming.category) {
    return null;
  }
  const titleSimilarity = calculateTextSimilarity(existing.title, incoming.title);
  const contentSimilarity = calculateTextSimilarity(existing.content, incoming.content);
  const tagSimilarity = calculateTagSimilarity(existing.tags, incoming.tags || []);
  const overallSimilarity = titleSimilarity * 0.4 + contentSimilarity * 0.4 + tagSimilarity * 0.2;
  if (overallSimilarity > 0.8) {
    if (contentSimilarity > 0.9) {
      return {
        existing,
        incoming,
        type: "duplicate",
        description: `Content is almost identical to existing memory. (Similarity: ${(overallSimilarity * 100).toFixed(1)}%)`
      };
    }
    return {
      existing,
      incoming,
      type: "update",
      description: `Appears to be an update of existing memory. (Similarity: ${(overallSimilarity * 100).toFixed(1)}%)`
    };
  }
  if (overallSimilarity > 0.5 && titleSimilarity > 0.6) {
    const contradictionIndicators = ["no", "not", "opposite", "instead", "rather", "not", "don't", "instead"];
    const hasContradiction = contradictionIndicators.some((indicator) => incoming.content.toLowerCase().includes(indicator) || existing.content.toLowerCase().includes(indicator));
    if (hasContradiction) {
      return {
        existing,
        incoming,
        type: "contradiction",
        description: `May contradict existing memory. (Similarity: ${(overallSimilarity * 100).toFixed(1)}%)`
      };
    }
  }
  return null;
}
function resolveConflict(conflict) {
  const { existing, incoming, type } = conflict;
  switch (type) {
    case "duplicate":
      return {
        action: "keep_existing",
        reason: "Duplicate content, so keeping and reinforcing existing memory."
      };
    case "update":
      const existingEffectiveConfidence = calculateEffectiveConfidence(existing);
      const incomingConfidence = incoming.confidence ?? 0.5;
      if (incomingConfidence >= existingEffectiveConfidence) {
        return {
          action: "replace",
          reason: `New memory confidence(${incomingConfidence.toFixed(2)})than existing(${existingEffectiveConfidence.toFixed(2)})or higher, so replacing.`
        };
      } else {
        return {
          action: "merge",
          mergedMemory: mergeMemories(existing, incoming),
          reason: `Existing memory has higher confidence, so merging information.`
        };
      }
    case "contradiction":
      return {
        action: "replace",
        reason: "Replacing with new memory per recency principle. Existing memory treated as contradiction."
      };
    default:
      return {
        action: "keep_both",
        reason: "Cannot determine conflict type, keeping both."
      };
  }
}
function mergeMemories(existing, incoming) {
  const now = new Date;
  const mergedTags = [...new Set([...existing.tags, ...incoming.tags || []])];
  const mergedSources = [...new Set([...existing.sources, ...incoming.sources || []])];
  const mergedRelated = [
    ...new Set([...existing.relatedMemories, ...incoming.relatedMemories || []])
  ];
  const existingWeight = existing.reinforcementCount + 1;
  const incomingWeight = 1;
  const totalWeight = existingWeight + incomingWeight;
  const mergedConfidence = (existing.confidence * existingWeight + (incoming.confidence ?? 0.5) * incomingWeight) / totalWeight;
  return {
    ...existing,
    content: `${existing.content}

[Updated ${now.toISOString().split("T")[0]}]
${incoming.content}`,
    tags: mergedTags,
    sources: mergedSources,
    relatedMemories: mergedRelated,
    confidence: Math.min(1, mergedConfidence),
    updatedAt: now,
    reinforcementCount: existing.reinforcementCount + 1,
    metadata: {
      ...existing.metadata,
      ...incoming.metadata || {},
      mergedAt: now.toISOString()
    }
  };
}
function detectBatchConflicts(existingMemories, incoming) {
  const conflicts = [];
  for (const existing of existingMemories) {
    const conflict = detectConflict(existing, incoming);
    if (conflict) {
      conflicts.push(conflict);
    }
  }
  return conflicts.sort((a, b) => {
    const simA = calculateTextSimilarity(a.existing.content, incoming.content);
    const simB = calculateTextSimilarity(b.existing.content, incoming.content);
    return simB - simA;
  });
}
function autoResolveConflicts(conflicts) {
  const resolutions = new Map;
  for (const conflict of conflicts) {
    const resolution = resolveConflict(conflict);
    resolutions.set(conflict.existing.id, resolution);
  }
  return resolutions;
}
// src/features/memory/search.ts
function calculateKeywordScore(memory, keyword) {
  const lowerKeyword = keyword.toLowerCase();
  let score = 0;
  if (memory.title.toLowerCase().includes(lowerKeyword)) {
    score += 3;
  }
  const contentLower = memory.content.toLowerCase();
  const contentMatches = (contentLower.match(new RegExp(lowerKeyword, "g")) || []).length;
  score += Math.min(contentMatches, 5);
  if (memory.tags.some((tag) => tag.toLowerCase() === lowerKeyword)) {
    score += 4;
  }
  if (memory.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))) {
    score += 2;
  }
  return score;
}
function isWithinDays(memory, days) {
  const now = new Date;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return memory.updatedAt >= cutoff;
}
function filterMemories(memories, query) {
  return memories.filter((memory) => {
    if (query.categories && query.categories.length > 0) {
      if (!query.categories.includes(memory.category)) {
        return false;
      }
    }
    if (query.scope && memory.scope !== query.scope) {
      return false;
    }
    if (query.owner && memory.owner !== query.owner) {
      return false;
    }
    if (query.minConfidence !== undefined) {
      const effectiveConfidence = calculateEffectiveConfidence(memory);
      if (effectiveConfidence < query.minConfidence) {
        return false;
      }
    }
    if (query.tags && query.tags.length > 0) {
      const memoryTagsLower = memory.tags.map((t) => t.toLowerCase());
      const hasAllTags = query.tags.every((tag) => memoryTagsLower.includes(tag.toLowerCase()));
      if (!hasAllTags) {
        return false;
      }
    }
    if (query.withinDays !== undefined) {
      if (!isWithinDays(memory, query.withinDays)) {
        return false;
      }
    }
    if (query.keyword) {
      const score = calculateKeywordScore(memory, query.keyword);
      if (score === 0) {
        return false;
      }
    }
    return true;
  });
}
function calculateRelevanceScore(memory, context) {
  let score = 0;
  const effectiveConfidence = calculateEffectiveConfidence(memory);
  score += effectiveConfidence * 10;
  if (context.keywords) {
    for (const keyword of context.keywords) {
      score += calculateKeywordScore(memory, keyword) * 2;
    }
  }
  if (context.currentTask) {
    const taskWords = context.currentTask.toLowerCase().split(/\s+/);
    for (const word of taskWords) {
      if (word.length > 2) {
        score += calculateKeywordScore(memory, word) * 0.5;
      }
    }
  }
  if (context.currentAgent && memory.owner === context.currentAgent) {
    score += 5;
  }
  if (context.recentTags) {
    const matchingTags = memory.tags.filter((tag) => context.recentTags.some((rt) => rt.toLowerCase() === tag.toLowerCase()));
    score += matchingTags.length * 3;
  }
  const daysSinceAccess = Math.floor((Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceAccess < 7) {
    score += (7 - daysSinceAccess) * 0.5;
  }
  score += Math.min(memory.reinforcementCount, 10) * 0.5;
  return score;
}
function sortMemories(memories, sortBy = "relevance", sortOrder = "desc", relevanceScores) {
  const sorted = [...memories].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "confidence":
        comparison = calculateEffectiveConfidence(a) - calculateEffectiveConfidence(b);
        break;
      case "createdAt":
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case "updatedAt":
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case "accessCount":
        comparison = a.accessCount - b.accessCount;
        break;
      case "relevance":
      default:
        if (relevanceScores) {
          comparison = (relevanceScores.get(a.id) || 0) - (relevanceScores.get(b.id) || 0);
        } else {
          comparison = calculateEffectiveConfidence(a) - calculateEffectiveConfidence(b);
        }
        break;
    }
    return sortOrder === "desc" ? -comparison : comparison;
  });
  return sorted;
}
function searchMemories(memories, query, context) {
  let filtered = filterMemories(memories, query);
  const scores = new Map;
  for (const memory of filtered) {
    const score = calculateRelevanceScore(memory, context || {});
    scores.set(memory.id, score);
  }
  const sorted = sortMemories(filtered, query.sortBy, query.sortOrder, scores);
  const offset = query.offset || 0;
  const limit = query.limit || sorted.length;
  const paginated = sorted.slice(offset, offset + limit);
  return {
    memories: paginated,
    total: filtered.length,
    scores
  };
}
function findSimilarMemories(targetMemory, allMemories, limit = 5) {
  const scores = new Map;
  for (const memory of allMemories) {
    if (memory.id === targetMemory.id)
      continue;
    let score = 0;
    if (memory.category === targetMemory.category) {
      score += 5;
    }
    if (memory.owner === targetMemory.owner) {
      score += 3;
    }
    const commonTags = memory.tags.filter((tag) => targetMemory.tags.some((tt) => tt.toLowerCase() === tag.toLowerCase()));
    score += commonTags.length * 2;
    const targetWords = targetMemory.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const word of targetWords.slice(0, 10)) {
      if (memory.content.toLowerCase().includes(word)) {
        score += 1;
      }
    }
    scores.set(memory.id, score);
  }
  return allMemories.filter((m) => m.id !== targetMemory.id && (scores.get(m.id) || 0) > 0).sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0)).slice(0, limit);
}
function groupByCategory(memories) {
  const groups = new Map;
  for (const memory of memories) {
    const existing = groups.get(memory.category) || [];
    existing.push(memory);
    groups.set(memory.category, existing);
  }
  return groups;
}
function analyzeTagFrequency(memories) {
  const frequency = new Map;
  for (const memory of memories) {
    for (const tag of memory.tags) {
      const lowerTag = tag.toLowerCase();
      frequency.set(lowerTag, (frequency.get(lowerTag) || 0) + 1);
    }
  }
  return new Map([...frequency.entries()].sort((a, b) => b[1] - a[1]));
}
// node_modules/uuid/wrapper.mjs
var import_dist = __toESM(require_dist(), 1);
var v1 = import_dist.default.v1;
var v3 = import_dist.default.v3;
var v4 = import_dist.default.v4;
var v5 = import_dist.default.v5;
var NIL = import_dist.default.NIL;
var version = import_dist.default.version;
var validate = import_dist.default.validate;
var stringify = import_dist.default.stringify;
var parse = import_dist.default.parse;

// src/features/memory/manager.ts
class MemoryManager {
  storage;
  cache;
  cacheExpiry = 5 * 60 * 1000;
  constructor(storage) {
    this.storage = storage || getDefaultStorage();
    this.cache = {
      global: [],
      project: [],
      lastLoaded: null
    };
  }
  async initialize() {
    await this.storage.initialize();
    await this.loadMemories();
  }
  async loadMemories(force = false) {
    const now = new Date;
    if (!force && this.cache.lastLoaded && now.getTime() - this.cache.lastLoaded.getTime() < this.cacheExpiry) {
      return;
    }
    const { global, project } = await this.storage.loadAllMemories();
    this.cache.global = global.map((m) => applyDecay(m));
    this.cache.project = project.map((m) => applyDecay(m));
    this.cache.lastLoaded = now;
  }
  getAllMemories() {
    const projectIds = new Set(this.cache.project.map((m) => m.id));
    const globalFiltered = this.cache.global.filter((m) => !projectIds.has(m.id));
    return [...this.cache.project, ...globalFiltered];
  }
  async create(input) {
    await this.loadMemories();
    const now = new Date;
    const allMemories = this.getAllMemories();
    const conflicts = detectBatchConflicts(allMemories, input);
    if (conflicts.length > 0) {
      const resolutions = autoResolveConflicts(conflicts);
      const firstConflict = conflicts[0];
      const resolution = resolutions.get(firstConflict.existing.id);
      if (resolution) {
        switch (resolution.action) {
          case "keep_existing":
            const reinforced = reinforceMemory(firstConflict.existing);
            await this.storage.saveMemory(reinforced);
            this.invalidateCache();
            return reinforced;
          case "replace":
            const contradicted = contradictMemory(firstConflict.existing);
            await this.storage.saveMemory(contradicted);
            break;
          case "merge":
            if (resolution.mergedMemory) {
              await this.storage.saveMemory(resolution.mergedMemory);
              this.invalidateCache();
              return resolution.mergedMemory;
            }
            break;
        }
      }
    }
    const memory = {
      id: v4(),
      title: input.title,
      content: input.content,
      category: input.category,
      scope: input.scope,
      owner: input.owner || "shared",
      confidence: input.confidence ?? 0.5,
      tags: input.tags || [],
      sources: input.sources || [],
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      reinforcementCount: 0,
      decayFactor: 1,
      contradictionCount: 0,
      relatedMemories: input.relatedMemories || [],
      metadata: input.metadata || {}
    };
    await this.storage.saveMemory(memory);
    this.invalidateCache();
    return memory;
  }
  async read(id) {
    await this.loadMemories();
    const memory = this.getAllMemories().find((m) => m.id === id);
    if (memory) {
      const updated = recordAccess(memory);
      await this.storage.saveMemory(updated);
      return updated;
    }
    return null;
  }
  async update(id, input) {
    await this.loadMemories();
    const memory = this.getAllMemories().find((m) => m.id === id);
    if (!memory) {
      return null;
    }
    const now = new Date;
    const updated = {
      ...memory,
      title: input.title ?? memory.title,
      content: input.content ?? memory.content,
      category: input.category ?? memory.category,
      confidence: input.confidence ?? memory.confidence,
      tags: input.tags ?? memory.tags,
      sources: input.sources ?? memory.sources,
      relatedMemories: input.relatedMemories ?? memory.relatedMemories,
      metadata: { ...memory.metadata, ...input.metadata || {} },
      updatedAt: now
    };
    await this.storage.saveMemory(updated);
    this.invalidateCache();
    return updated;
  }
  async delete(id) {
    await this.loadMemories();
    const memory = this.getAllMemories().find((m) => m.id === id);
    if (!memory) {
      return false;
    }
    const result = await this.storage.deleteMemory(id, memory.scope);
    this.invalidateCache();
    return result;
  }
  async search(query, context) {
    await this.loadMemories();
    return searchMemories(this.getAllMemories(), query, context);
  }
  async reinforce(id) {
    await this.loadMemories();
    const memory = this.getAllMemories().find((m) => m.id === id);
    if (!memory) {
      return null;
    }
    const reinforced = reinforceMemory(memory);
    await this.storage.saveMemory(reinforced);
    this.invalidateCache();
    return reinforced;
  }
  async contradict(id) {
    await this.loadMemories();
    const memory = this.getAllMemories().find((m) => m.id === id);
    if (!memory) {
      return null;
    }
    const contradicted = contradictMemory(memory);
    await this.storage.saveMemory(contradicted);
    this.invalidateCache();
    return contradicted;
  }
  async findSimilar(id, limit = 5) {
    await this.loadMemories();
    const memory = this.getAllMemories().find((m) => m.id === id);
    if (!memory) {
      return [];
    }
    return findSimilarMemories(memory, this.getAllMemories(), limit);
  }
  async generateSummary(query, maxTokens = 500) {
    await this.loadMemories();
    let memories = this.getAllMemories();
    if (query) {
      const result = await this.search(query);
      memories = result.memories;
    }
    const sorted = memories.map((m) => ({ memory: m, confidence: calculateEffectiveConfidence(m) })).sort((a, b) => b.confidence - a.confidence);
    const lines = [];
    const includedIds = [];
    let estimatedTokens = 0;
    const tokensPerChar = 0.25;
    for (const { memory } of sorted) {
      const line = `- [${memory.category}] ${memory.title}: ${memory.content.slice(0, 100)}${memory.content.length > 100 ? "..." : ""}`;
      const lineTokens = Math.ceil(line.length * tokensPerChar);
      if (estimatedTokens + lineTokens > maxTokens) {
        break;
      }
      lines.push(line);
      includedIds.push(memory.id);
      estimatedTokens += lineTokens;
    }
    return {
      text: lines.join(`
`),
      includedMemoryIds: includedIds,
      generatedAt: new Date,
      estimatedTokens
    };
  }
  async processDecay() {
    await this.loadMemories(true);
    const globalResult = processBatchDecay(this.cache.global, {
      threshold: this.storage.getConfig().decayThreshold,
      applyChanges: true
    });
    const projectResult = processBatchDecay(this.cache.project, {
      threshold: this.storage.getConfig().decayThreshold,
      applyChanges: true
    });
    for (const memory of [...globalResult.removed, ...projectResult.removed]) {
      await this.storage.deleteMemory(memory.id, memory.scope);
    }
    this.invalidateCache();
    return {
      removed: globalResult.removed.length + projectResult.removed.length,
      remaining: globalResult.processed.length + projectResult.processed.length
    };
  }
  async getStats() {
    await this.loadMemories();
    const all = this.getAllMemories();
    const byCategory = groupByCategory(all);
    const tagFrequency = analyzeTagFrequency(all);
    const categoryCount = new Map;
    for (const [cat, memories] of byCategory) {
      categoryCount.set(cat, memories.length);
    }
    const ownerCount = new Map;
    for (const memory of all) {
      ownerCount.set(memory.owner, (ownerCount.get(memory.owner) || 0) + 1);
    }
    const avgConfidence = all.length > 0 ? all.reduce((sum, m) => sum + calculateEffectiveConfidence(m), 0) / all.length : 0;
    return {
      total: all.length,
      global: this.cache.global.length,
      project: this.cache.project.length,
      byCategory: categoryCount,
      byOwner: ownerCount,
      averageConfidence: avgConfidence,
      topTags: [...tagFrequency.entries()].slice(0, 10)
    };
  }
  async forget(keyword) {
    await this.loadMemories();
    const result = await this.search({ keyword });
    let deletedCount = 0;
    for (const memory of result.memories) {
      const deleted = await this.delete(memory.id);
      if (deleted) {
        deletedCount++;
      }
    }
    return deletedCount;
  }
  invalidateCache() {
    this.cache.lastLoaded = null;
  }
  async backup() {
    return this.storage.createBackup();
  }
}
var defaultManager = null;
function getMemoryManager() {
  if (!defaultManager) {
    defaultManager = new MemoryManager;
  }
  return defaultManager;
}
// src/hooks/post-task-reflection.ts
function parseTaskResult(toolName, toolInput, toolOutput, sessionState) {
  if (toolName !== "Task") {
    return null;
  }
  const taskId = `task-${Date.now()}`;
  const description = toolInput.prompt || toolInput.description || "";
  const agent = toolInput.subagent_type?.replace("team-seokan:", "") || "shared";
  const success = !toolOutput.toLowerCase().includes("error") && !toolOutput.toLowerCase().includes("failed") && !toolOutput.toLowerCase().includes("failed");
  const errors = [];
  const errorMatches = toolOutput.match(/error:?\s*(.+?)(?:\n|$)/gi);
  if (errorMatches) {
    errors.push(...errorMatches.map((e) => e.trim()));
  }
  const filesModified = [];
  const fileMatches = toolOutput.match(/(?:created|modified|edited|wrote)\s+([^\s]+\.[a-z]+)/gi);
  if (fileMatches) {
    filesModified.push(...fileMatches.map((m) => m.replace(/^(created|modified|edited|wrote)\s+/i, "")));
  }
  const codeChanges = filesModified.map((file) => ({
    filePath: file,
    changeType: "modify",
    language: file.split(".").pop() || "unknown",
    linesAdded: 0,
    linesRemoved: 0,
    summary: ""
  }));
  const duration = sessionState?.taskStartTime ? Date.now() - sessionState.taskStartTime : 0;
  return {
    taskId,
    description,
    success,
    agent,
    filesModified,
    codeChanges,
    duration,
    errors,
    context: {}
  };
}
function createPostTaskReflectionHook(context) {
  return {
    name: "post-task-reflection",
    event: "PostToolUse",
    description: "Executes automatic reflection after task completion.",
    enabled: true,
    priority: 50,
    handler: async ({
      toolName,
      toolInput,
      toolOutput,
      sessionState
    }) => {
      if (toolName !== "Task") {
        return { continue: true };
      }
      try {
        const taskResult = parseTaskResult(toolName, toolInput, toolOutput, sessionState);
        if (!taskResult) {
          return { continue: true };
        }
        const reflection = reflect(taskResult);
        const manager = getMemoryManager();
        await manager.initialize();
        for (const learning of reflection.learnings) {
          await manager.create(learning);
        }
        const summary = summarizeReflection(reflection);
        return {
          continue: true,
          message: `
<reflection>
${summary}
</reflection>
`
        };
      } catch (error) {
        console.error("Reflection error:", error);
        return { continue: true };
      }
    }
  };
}
// src/features/learning/implicit.ts
function analyzeChange(original, modified) {
  if (!original || !modified) {
    return {
      hasSubstantialChange: false,
      changeType: "unknown",
      changedElements: [],
      confidence: 0
    };
  }
  const originalLines = original.split(`
`);
  const modifiedLines = modified.split(`
`);
  const changedElements = [];
  let styleChanges = 0;
  let logicChanges = 0;
  let namingChanges = 0;
  let structureChanges = 0;
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  let changedLines = 0;
  for (let i = 0;i < maxLines; i++) {
    const origLine = originalLines[i] || "";
    const modLine = modifiedLines[i] || "";
    if (origLine !== modLine) {
      changedLines++;
      if (origLine.trim() === modLine.trim()) {
        styleChanges++;
        changedElements.push("whitespace");
      } else if (origLine.replace(/['"]/g, "") === modLine.replace(/['"]/g, "")) {
        styleChanges++;
        changedElements.push("quote-style");
      } else if (origLine.replace(/;/g, "") === modLine.replace(/;/g, "")) {
        styleChanges++;
        changedElements.push("semicolon");
      } else if (hasNamingChange(origLine, modLine)) {
        namingChanges++;
        changedElements.push("naming");
      } else if (hasStructureChange(originalLines, modifiedLines, i)) {
        structureChanges++;
        changedElements.push("structure");
      } else {
        logicChanges++;
        changedElements.push("logic");
      }
    }
  }
  const changeRatio = changedLines / maxLines;
  const hasSubstantialChange = changeRatio > 0.05 || logicChanges > 0 || structureChanges > 0;
  let changeType = "unknown";
  const maxChanges = Math.max(styleChanges, logicChanges, namingChanges, structureChanges);
  if (maxChanges === 0) {
    changeType = "minor";
  } else if (maxChanges === styleChanges) {
    changeType = "style";
  } else if (maxChanges === logicChanges) {
    changeType = "logic";
  } else if (maxChanges === namingChanges) {
    changeType = "naming";
  } else if (maxChanges === structureChanges) {
    changeType = "structure";
  }
  return {
    hasSubstantialChange,
    changeType,
    changedElements: [...new Set(changedElements)],
    confidence: Math.min(0.9, 0.5 + changeRatio)
  };
}
function hasNamingChange(original, modified) {
  const namePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const origNames = new Set(original.match(namePattern) || []);
  const modNames = new Set(modified.match(namePattern) || []);
  const newNames = [...modNames].filter((n) => !origNames.has(n));
  const removedNames = [...origNames].filter((n) => !modNames.has(n));
  return newNames.length > 0 && removedNames.length > 0;
}
function hasStructureChange(originalLines, modifiedLines, lineIndex) {
  const getIndent = (line) => (line.match(/^\s*/) || [""])[0].length;
  if (lineIndex < originalLines.length && lineIndex < modifiedLines.length) {
    const origIndent = getIndent(originalLines[lineIndex]);
    const modIndent = getIndent(modifiedLines[lineIndex]);
    if (Math.abs(origIndent - modIndent) >= 2) {
      return true;
    }
  }
  if (Math.abs(originalLines.length - modifiedLines.length) > 5) {
    return true;
  }
  return false;
}
function detectImplicitFeedback(action) {
  switch (action.type) {
    case "edit":
    case "modify":
      if (action.context.originalContent && action.context.modifiedContent) {
        const analysis = analyzeChange(action.context.originalContent, action.context.modifiedContent);
        if (analysis.hasSubstantialChange) {
          return {
            type: "modification",
            original: action.context.originalContent,
            modified: action.context.modifiedContent,
            agent: action.context.agent || "shared",
            context: `${action.context.taskDescription || ""} - ${analysis.changeType} change`,
            timestamp: action.timestamp
          };
        }
      }
      break;
    case "undo":
    case "reject":
      return {
        type: "rejection",
        original: action.context.originalContent || "",
        agent: action.context.agent || "shared",
        context: action.context.taskDescription || "User rejected changes",
        timestamp: action.timestamp
      };
    case "accept":
      return {
        type: "acceptance",
        original: action.context.originalContent || "",
        agent: action.context.agent || "shared",
        context: action.context.taskDescription || "User approved changes",
        timestamp: action.timestamp
      };
    case "retry":
      return {
        type: "correction",
        original: action.context.errorMessage || action.context.originalContent || "",
        agent: action.context.agent || "shared",
        context: "User requested retry",
        timestamp: action.timestamp
      };
  }
  return null;
}
function extractLearningFromFeedback(feedback) {
  const learnings = [];
  const reinforceMemoryIds = [];
  const contradictMemoryIds = [];
  switch (feedback.type) {
    case "modification": {
      if (feedback.original && feedback.modified) {
        const analysis = analyzeChange(feedback.original, feedback.modified);
        if (analysis.changeType === "style") {
          learnings.push({
            title: "Coding Style Preference",
            content: `User modified code style. Changed elements: ${analysis.changedElements.join(", ")}`,
            category: "preference",
            scope: "global",
            owner: feedback.agent,
            confidence: analysis.confidence * 0.8,
            tags: ["style", "preference", ...analysis.changedElements],
            sources: [feedback.timestamp.toISOString()]
          });
        } else if (analysis.changeType === "naming") {
          learnings.push({
            title: "Naming Preference",
            content: `User modified variable/function names.`,
            category: "preference",
            scope: "project",
            owner: feedback.agent,
            confidence: analysis.confidence * 0.9,
            tags: ["naming", "convention"],
            sources: [feedback.timestamp.toISOString()]
          });
        } else if (analysis.changeType === "logic") {
          learnings.push({
            title: "Logic Modification",
            content: `User ${feedback.agent} agent logic modified. Context: ${feedback.context}`,
            category: "mistake",
            scope: "project",
            owner: feedback.agent,
            confidence: analysis.confidence,
            tags: ["logic", "correction"],
            sources: [feedback.timestamp.toISOString()]
          });
        }
      }
      break;
    }
    case "rejection":
      learnings.push({
        title: "Rejected Approach",
        content: `User ${feedback.agent} agent proposal rejected. Context: ${feedback.context}`,
        category: "mistake",
        scope: "global",
        owner: feedback.agent,
        confidence: 0.8,
        tags: ["rejection", "avoid"],
        sources: [feedback.timestamp.toISOString()]
      });
      break;
    case "acceptance":
      learnings.push({
        title: "Approved Approach",
        content: `User ${feedback.agent} agent work approved. Context: ${feedback.context}`,
        category: "pattern",
        scope: "global",
        owner: feedback.agent,
        confidence: 0.7,
        tags: ["approved", "success"],
        sources: [feedback.timestamp.toISOString()]
      });
      break;
    case "correction":
      learnings.push({
        title: "Task Requiring Modification",
        content: `Retry requested. Original Result: ${feedback.original}`,
        category: "mistake",
        scope: "project",
        owner: feedback.agent,
        confidence: 0.7,
        tags: ["retry", "correction"],
        sources: [feedback.timestamp.toISOString()]
      });
      break;
  }
  return {
    learnings,
    reinforceMemoryIds,
    contradictMemoryIds,
    extractionConfidence: 0.7
  };
}
// src/hooks/implicit-feedback.ts
function extractEditFeedback(toolInput, toolOutput, sessionState) {
  const filePath = toolInput.file_path;
  const oldString = toolInput.old_string;
  const newString = toolInput.new_string;
  if (!filePath || !oldString || !newString) {
    return null;
  }
  const lastAgentOutput = sessionState.lastAgentOutput;
  const lastAgent = sessionState.lastAgent;
  if (lastAgentOutput && lastAgentOutput.includes(oldString)) {
    return {
      type: "modify",
      timestamp: new Date,
      context: {
        filePath,
        originalContent: oldString,
        modifiedContent: newString,
        agent: lastAgent,
        taskDescription: `${filePath} modification`
      }
    };
  }
  return null;
}
function detectUndoAction(toolInput, sessionState) {
  const command = toolInput.command;
  if (!command)
    return null;
  const undoPatterns = [
    /git\s+(revert|checkout|reset)/i,
    /rm\s+-rf?\s+.*\.(ts|js|tsx|jsx|py)/i
  ];
  for (const pattern of undoPatterns) {
    if (pattern.test(command)) {
      return {
        type: "undo",
        timestamp: new Date,
        context: {
          agent: sessionState.lastAgent,
          taskDescription: `Command execution: ${command}`
        }
      };
    }
  }
  return null;
}
function createImplicitFeedbackHook(context) {
  return {
    name: "implicit-feedback",
    event: "PostToolUse",
    description: "Detects implicit feedback from user modification/rejection actions.",
    enabled: true,
    priority: 40,
    handler: async ({
      toolName,
      toolInput,
      toolOutput,
      sessionState
    }) => {
      let userAction = null;
      const state = sessionState;
      if (toolName === "Edit" && state) {
        userAction = extractEditFeedback(toolInput, toolOutput, state);
      }
      if (toolName === "Bash" && state) {
        userAction = detectUndoAction(toolInput, state);
      }
      if (!userAction) {
        return { continue: true };
      }
      try {
        const feedback = detectImplicitFeedback(userAction);
        if (!feedback) {
          return { continue: true };
        }
        const extraction = extractLearningFromFeedback(feedback);
        if (extraction.learnings.length === 0) {
          return { continue: true };
        }
        const manager = getMemoryManager();
        await manager.initialize();
        for (const learning of extraction.learnings) {
          await manager.create(learning);
        }
        for (const id of extraction.reinforceMemoryIds) {
          await manager.reinforce(id);
        }
        for (const id of extraction.contradictMemoryIds) {
          await manager.contradict(id);
        }
        return {
          continue: true,
          message: `\uD83D\uDCA1 Implicit feedback learned: ${extraction.learnings[0]?.title || ""}`
        };
      } catch (error) {
        console.error("Implicit feedback error:", error);
        return { continue: true };
      }
    }
  };
}

// src/features/context/injector.ts
var DEFAULT_OPTIONS = {
  currentTask: "",
  keywords: [],
  maxTokens: 500,
  includeCategories: [],
  excludeCategories: [],
  minConfidence: 0.3,
  includeDetails: false
};
function estimateTokens(text) {
  const koreanChars = (text.match(/[가-힣]/g) || []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(koreanChars * 1.5 + otherChars * 0.25);
}
function filterMemories2(memories, options) {
  return memories.filter((memory) => {
    const confidence = calculateEffectiveConfidence(memory);
    if (confidence < options.minConfidence) {
      return false;
    }
    if (options.includeCategories.length > 0) {
      if (!options.includeCategories.includes(memory.category)) {
        return false;
      }
    }
    if (options.excludeCategories.length > 0) {
      if (options.excludeCategories.includes(memory.category)) {
        return false;
      }
    }
    return true;
  });
}
function rankMemories(memories, options) {
  const scores = new Map;
  for (const memory of memories) {
    let score = calculateRelevanceScore(memory, {
      keywords: options.keywords,
      currentTask: options.currentTask,
      currentAgent: options.agent
    });
    if (memory.owner === options.agent) {
      score *= 1.5;
    }
    if (memory.owner === "shared") {
      score *= 0.9;
    }
    scores.set(memory.id, score);
  }
  return memories.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
}
function memoryToSummaryLine(memory) {
  const confidence = calculateEffectiveConfidence(memory);
  const confidenceStr = confidence >= 0.8 ? "⭐" : confidence >= 0.5 ? "○" : "·";
  return `${confidenceStr} [${memory.category}] ${memory.title}: ${memory.content.slice(0, 80)}${memory.content.length > 80 ? "..." : ""}`;
}
function generateSummary(memories, maxTokens) {
  const lines = [];
  const includedIds = [];
  let currentTokens = 0;
  const header = `## Learned Context
`;
  currentTokens += estimateTokens(header);
  for (const memory of memories) {
    const line = memoryToSummaryLine(memory);
    const lineTokens = estimateTokens(line + `
`);
    if (currentTokens + lineTokens > maxTokens) {
      break;
    }
    lines.push(line);
    includedIds.push(memory.id);
    currentTokens += lineTokens;
  }
  return {
    text: header + lines.join(`
`),
    includedIds,
    tokens: currentTokens
  };
}
async function generateContextInjection(options) {
  const fullOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  const manager = getMemoryManager();
  await manager.loadMemories();
  let memories = manager.getAllMemories();
  memories = filterMemories2(memories, fullOptions);
  memories = rankMemories(memories, fullOptions);
  const { text, includedIds, tokens } = generateSummary(memories, fullOptions.maxTokens);
  const details = fullOptions.includeDetails ? memories.filter((m) => includedIds.includes(m.id)) : [];
  const includedCategories = [
    ...new Set(memories.filter((m) => includedIds.includes(m.id)).map((m) => m.category))
  ];
  return {
    summary: text,
    details,
    totalTokens: tokens,
    includedCategories
  };
}
async function generateAgentContext(agent, task) {
  const agentCategories = {
    maenggu: ["pattern", "convention", "mistake"],
    suji: ["preference", "convention", "context"],
    heukgom: ["context", "decision", "pattern"],
    shinhyungman: ["insight", "decision", "mistake"],
    yuri: ["decision", "context", "pattern"],
    actiongamen: ["mistake", "convention", "insight"]
  };
  const injection = await generateContextInjection({
    agent,
    currentTask: task,
    keywords: extractKeywords(task),
    includeCategories: agentCategories[agent] || [],
    maxTokens: 400
  });
  if (injection.summary.trim() === "## Learned Context") {
    return "";
  }
  return `
<learned-context>
${injection.summary}
</learned-context>
`;
}
function extractKeywords(text) {
  const stopWords = new Set([
    "this",
    "that",
    "that",
    "thing",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "as",
    "this",
    "that"
  ]);
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  return [...new Set(words)].slice(0, 10);
}
class ContextCache {
  cache = new Map;
  ttl = 5 * 60 * 1000;
  get(agent, taskHash) {
    const key = `${agent}:${taskHash}`;
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.ttl) {
      return entry.context;
    }
    return null;
  }
  set(agent, taskHash, context) {
    const key = `${agent}:${taskHash}`;
    this.cache.set(key, { context, timestamp: Date.now() });
  }
  invalidate() {
    this.cache.clear();
  }
}
var contextCache = new ContextCache;
async function getCachedAgentContext(agent, task) {
  const taskHash = simpleHash(task);
  const cached = contextCache.get(agent, taskHash);
  if (cached !== null) {
    return cached;
  }
  const context = await generateAgentContext(agent, task);
  contextCache.set(agent, taskHash, context);
  return context;
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0;i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
// src/hooks/memory-injector.ts
function extractAgentName(subagentType) {
  if (subagentType.startsWith("team-seokan:")) {
    return subagentType.replace("team-seokan:", "");
  }
  const validAgents = [
    "jjangu",
    "jjanga",
    "maenggu",
    "cheolsu",
    "suji",
    "heukgom",
    "hooni",
    "shinhyungman",
    "yuri",
    "bongmisun",
    "actiongamen",
    "heendungi",
    "chaesunga",
    "namiri"
  ];
  if (validAgents.includes(subagentType)) {
    return subagentType;
  }
  return null;
}
function createMemoryInjectorHook(context) {
  return {
    name: "memory-injector",
    event: "PreToolUse",
    description: "Injects learned memory before agent execution.",
    enabled: true,
    priority: 80,
    handler: async ({
      toolName,
      toolInput,
      sessionState
    }) => {
      if (toolName !== "Task") {
        return { continue: true };
      }
      const input = toolInput;
      const subagentType = input.subagent_type;
      const prompt = input.prompt;
      if (!subagentType || !prompt) {
        return { continue: true };
      }
      const agentName = extractAgentName(subagentType);
      if (!agentName) {
        return { continue: true };
      }
      try {
        const memoryContext = await getCachedAgentContext(agentName, prompt);
        if (!memoryContext || memoryContext.trim() === "") {
          return { continue: true };
        }
        if (sessionState) {
          sessionState.lastAgent = agentName;
          sessionState.taskStartTime = Date.now();
        }
        return {
          continue: true,
          inject: memoryContext
        };
      } catch (error) {
        console.error("Memory injection error:", error);
        return { continue: true };
      }
    }
  };
}
function createMemoryInitHook(pluginContext) {
  return {
    name: "memory-init",
    event: "SessionStart",
    description: "Initializes memory system at session start.",
    enabled: true,
    priority: 100,
    handler: async ({ sessionState }) => {
      try {
        contextCache.invalidate();
        const state = sessionState;
        const isFirstRun = !state?.memoryInitialized;
        if (isFirstRun && state) {
          state.memoryInitialized = true;
          state.shouldRunBootstrap = true;
        }
        return {
          continue: true,
          message: isFirstRun ? "\uD83E\uDDE0 Memory system initialized" : undefined
        };
      } catch (error) {
        console.error("Memory init error:", error);
        return { continue: true };
      }
    }
  };
}

// src/hooks/index.ts
function createBuiltinHooks(settings, context) {
  const hooks = [];
  if (settings.enableTodoEnforcer) {
    hooks.push(createTodoContinuationEnforcerHook(context));
  }
  if (settings.enableRalphLoop) {
    hooks.push(createRalphLoopHook(context));
  }
  if (settings.enableIntentGate) {
    hooks.push(createKeywordDetectorHook(context));
  }
  if (settings.enableReviewerCheck) {
    hooks.push(createReviewerCheckHook(context));
  }
  hooks.push(createContextWindowMonitorHook(context));
  hooks.push(createPreemptiveCompactionHook(context));
  hooks.push(createToolOutputTruncatorHook(context));
  hooks.push(createEmptyTaskResponseDetectorHook(context));
  hooks.push(createCommentCheckerHook(context));
  hooks.push(createEditErrorRecoveryHook(context));
  hooks.push(createRulesInjectorHook(context));
  hooks.push(createDirectoryAgentsInjectorHook(context));
  hooks.push(createStopContinuationGuardHook(context));
  hooks.push(createMemoryInitHook(context));
  hooks.push(createMemoryInjectorHook(context));
  hooks.push(createPostTaskReflectionHook(context));
  hooks.push(createImplicitFeedbackHook(context));
  hooks.sort((a, b) => b.priority - a.priority);
  return hooks;
}

// src/tools/delegate-task/index.ts
function createDelegateTaskTool(context) {
  return {
    name: "delegate_task",
    description: `Delegates tasks to agents.

Available agents:
- jjangu (Shinnosuke): Orchestrator
- jjanga (Himawari): Master Orchestrator
- maenggu (Bo): Code writing/modification
- cheolsu (Kazama): Complex long-running tasks
- suji (Aichan): UI/UX Frontend
- heukgom (Bunta): API/DB Backend
- hooni (Masao): DevOps Infrastructure
- shinhyungman (Hiroshi): Strategic advice
- yuri (Nene): Planning
- bongmisun (Misae): Pre-analysis
- actiongamen (Action Kamen): Code verification
- heendungi (Shiro): Code exploration
- chaesunga (Masumi): Documentation search
- namiri (Ume): Image/PDF analysis`,
    parameters: [
      {
        name: "agent",
        type: "string",
        description: "Agent name to delegate (e.g.: maenggu, heendungi)",
        required: true
      },
      {
        name: "task",
        type: "string",
        description: "Task description to perform",
        required: true
      },
      {
        name: "context",
        type: "string",
        description: "Additional context information",
        required: false
      },
      {
        name: "run_in_background",
        type: "boolean",
        description: "Whether to run in background",
        required: false,
        default: false
      }
    ],
    handler: async (params) => {
      const agentName = params.agent;
      const task = params.task;
      const additionalContext = params.context;
      const runInBackground = params.run_in_background;
      const agent = context.agents.get(agentName);
      if (!agent) {
        return {
          success: false,
          error: `Cannot find agent '${agentName}'.`
        };
      }
      if (runInBackground) {
        const maxConcurrent = context.settings.maxConcurrentAgents;
        const runningTasks = context.sessionState.backgroundTasks.filter((t) => t.status === "running");
        if (runningTasks.length >= maxConcurrent) {
          return {
            success: false,
            error: `Maximum concurrent execution count(${maxConcurrent})reached.`
          };
        }
      }
      return {
        success: true,
        output: {
          delegatedTo: agentName,
          displayName: agent.metadata.displayName,
          role: agent.metadata.role,
          task,
          context: additionalContext,
          runInBackground,
          model: agent.metadata.model,
          instruction: `Task(subagent_type="team-seokan:${agentName}", model="${agent.metadata.model}", prompt="${task}")`
        }
      };
    }
  };
}

// src/tools/call-team-agent/index.ts
function createCallTeamAgentTool(context) {
  return {
    name: "call_team_agent",
    description: "Directly invokes specific Team-Shinchan agent.",
    parameters: [
      {
        name: "agent",
        type: "string",
        description: "Agent name to invoke",
        required: true
      },
      {
        name: "message",
        type: "string",
        description: "Message to pass to agent",
        required: true
      }
    ],
    handler: async (params) => {
      const agentName = params.agent;
      const message = params.message;
      const agent = context.agents.get(agentName);
      if (!agent) {
        return {
          success: false,
          error: `Cannot find agent '${agentName}'.`
        };
      }
      return {
        success: true,
        output: {
          agent: agentName,
          displayName: getAgentDisplayName(agentName),
          role: getAgentRole(agentName),
          message,
          systemPrompt: agent.systemPrompt,
          model: agent.metadata.model
        }
      };
    }
  };
}

// src/tools/background-task/index.ts
function createBackgroundTaskTool(context) {
  return {
    name: "background_task",
    description: "Executes agent task in background. Does not block main task.",
    parameters: [
      {
        name: "agent",
        type: "string",
        description: "Agent name to execute",
        required: true
      },
      {
        name: "task",
        type: "string",
        description: "Task to perform",
        required: true
      },
      {
        name: "description",
        type: "string",
        description: "Task description (for tracking)",
        required: false
      }
    ],
    handler: async (params) => {
      const agentName = params.agent;
      const task = params.task;
      const description = params.description || task;
      const agent = context.agents.get(agentName);
      if (!agent) {
        return {
          success: false,
          error: `Cannot find agent '${agentName}'.`
        };
      }
      const maxConcurrent = context.settings.maxConcurrentAgents;
      if (!canStartNewBackgroundTask(context.sessionState, maxConcurrent)) {
        return {
          success: false,
          error: `Maximum concurrent execution count(${maxConcurrent})reached. Please wait until existing tasks complete.`
        };
      }
      const backgroundTask = addBackgroundTask(context.sessionState, agentName, description);
      return {
        success: true,
        output: {
          taskId: backgroundTask.id,
          agent: agentName,
          displayName: agent.metadata.displayName,
          description,
          status: "running",
          instruction: `Task(subagent_type="team-seokan:${agentName}", model="${agent.metadata.model}", prompt="${task}", run_in_background=true)`
        }
      };
    }
  };
}

// src/tools/look-at/index.ts
function createLookAtTool(context) {
  return {
    name: "look_at",
    description: "Looks up files or images. Ume (Multimodal) agent can analyze.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "File path to look up",
        required: true
      },
      {
        name: "analyze",
        type: "boolean",
        description: "Request analysis from Ume for images",
        required: false,
        default: false
      }
    ],
    handler: async (params) => {
      const path2 = params.path;
      const analyze = params.analyze;
      const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
      const isImage = imageExtensions.some((ext) => path2.toLowerCase().endsWith(ext));
      const isPdf = path2.toLowerCase().endsWith(".pdf");
      if ((isImage || isPdf) && analyze) {
        return {
          success: true,
          output: {
            path: path2,
            type: isImage ? "image" : "pdf",
            recommendation: "Delegate analysis to Ume (Multimodal) agent.",
            instruction: `delegate_task(agent="namiri", task="Analyze this ${isImage ? "image" : "PDF"}: ${path2}")`
          }
        };
      }
      return {
        success: true,
        output: {
          path: path2,
          type: isImage ? "image" : isPdf ? "pdf" : "file",
          instruction: `Use the Read tool to read the file.`
        }
      };
    }
  };
}

// src/tools/skill/index.ts
function createSkillTool(context) {
  return {
    name: "skill",
    description: `Executes Team-Shinchan skills.

Available skills:
- ultrawork: Parallel execution mode
- ralph: Repeat execution until complete
- autopilot: Autonomous execution mode
- plan: Start planning session
- analyze: Analysis mode
- deepsearch: Deep search
- git-master: Git Expert mode
- frontend-ui-ux: UI/UX Expert mode
- help: Help
- cancel: Cancel current mode`,
    parameters: [
      {
        name: "name",
        type: "string",
        description: "Skill name to execute",
        required: true
      },
      {
        name: "args",
        type: "string",
        description: "Arguments to pass to skill",
        required: false
      }
    ],
    handler: async (params) => {
      const skillName = params.name;
      const args = params.args;
      const skill = context.skills.get(skillName);
      if (!skill) {
        return {
          success: false,
          error: `Cannot find skill '${skillName}'.`
        };
      }
      const result = await skill.handler({
        args,
        message: args || "",
        sessionState: context.sessionState
      });
      return result;
    }
  };
}

// src/tools/slashcommand/index.ts
function createSlashcommandTool(context) {
  return {
    name: "slashcommand",
    description: "Executes Team-Shinchan slash commands.",
    parameters: [
      {
        name: "command",
        type: "string",
        description: "Command to execute (e.g.: team-seokan:help)",
        required: true
      },
      {
        name: "args",
        type: "string",
        description: "Command arguments",
        required: false
      }
    ],
    handler: async (params) => {
      const command = params.command;
      const args = params.args;
      const normalizedCommand = command.startsWith("team-seokan:") ? command.replace("team-seokan:", "") : command;
      const skill = context.skills.get(normalizedCommand);
      if (skill) {
        const result = await skill.handler({
          args,
          message: args || "",
          sessionState: context.sessionState
        });
        return result;
      }
      return {
        success: false,
        error: `Cannot find command '${command}'.`
      };
    }
  };
}

// src/tools/interactive-bash/index.ts
function createInteractiveBashTool(context) {
  return {
    name: "interactive_bash",
    description: "Starts interactive bash session. Use for commands requiring user input.",
    parameters: [
      {
        name: "command",
        type: "string",
        description: "Command to execute",
        required: true
      },
      {
        name: "timeout",
        type: "number",
        description: "Timeout (milliseconds)",
        required: false,
        default: 30000
      }
    ],
    handler: async (params) => {
      const command = params.command;
      const timeout = params.timeout;
      return {
        success: true,
        output: {
          command,
          timeout,
          note: "Interactive bash session is managed through tmux.",
          instruction: `Use the Bash tool: Bash(command="${command}", timeout=${timeout})`
        }
      };
    }
  };
}

// src/tools/ast-grep/index.ts
function createAstGrepTool(context) {
  return {
    name: "ast_grep",
    description: "Searches code patterns based on AST (Abstract Syntax Tree). Useful for precise code structure matching.",
    parameters: [
      {
        name: "pattern",
        type: "string",
        description: "AST pattern to search",
        required: true
      },
      {
        name: "language",
        type: "string",
        description: "Target language (typescript, javascript, python, etc.)",
        required: true
      },
      {
        name: "path",
        type: "string",
        description: "Path to search",
        required: false,
        default: "."
      }
    ],
    handler: async (params) => {
      const pattern = params.pattern;
      const language = params.language;
      const path2 = params.path;
      return {
        success: true,
        output: {
          pattern,
          language,
          path: path2,
          instruction: `Use ast-grep CLI: sg --pattern "${pattern}" --lang ${language} ${path2}`
        }
      };
    }
  };
}

// src/tools/lsp/index.ts
function createLspDiagnosticsTool(context) {
  return {
    name: "lsp_diagnostics",
    description: "Uses LSP to check type errors and lint errors in files or directories.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "File or directory path to diagnose",
        required: true
      }
    ],
    handler: async (params) => {
      const path2 = params.path;
      return {
        success: true,
        output: {
          path: path2,
          note: "Use tsc --noEmit for TypeScript projects.",
          instruction: `Bash(command="npx tsc --noEmit", description="TypeScript type check")`
        }
      };
    }
  };
}
function createLspRenameTool(context) {
  return {
    name: "lsp_rename",
    description: "Uses LSP to safely rename symbols across the entire project.",
    parameters: [
      {
        name: "file",
        type: "string",
        description: "File where symbol is defined",
        required: true
      },
      {
        name: "line",
        type: "number",
        description: "Line number of symbol",
        required: true
      },
      {
        name: "column",
        type: "number",
        description: "Column number of symbol",
        required: true
      },
      {
        name: "newName",
        type: "string",
        description: "New name",
        required: true
      }
    ],
    handler: async (params) => {
      const file = params.file;
      const line = params.line;
      const column = params.column;
      const newName = params.newName;
      return {
        success: true,
        output: {
          file,
          position: { line, column },
          newName,
          note: "Use IDE refactoring features or ts-morph to safely rename."
        }
      };
    }
  };
}
function createLspReferencesTool(context) {
  return {
    name: "lsp_references",
    description: "Uses LSP to find all references to a symbol.",
    parameters: [
      {
        name: "file",
        type: "string",
        description: "File where symbol is defined",
        required: true
      },
      {
        name: "line",
        type: "number",
        description: "Line number of symbol",
        required: true
      },
      {
        name: "column",
        type: "number",
        description: "Column number of symbol",
        required: true
      }
    ],
    handler: async (params) => {
      const file = params.file;
      const line = params.line;
      const column = params.column;
      return {
        success: true,
        output: {
          file,
          position: { line, column },
          instruction: `Search symbol name with Grep tool, or delegate to Shiro (Explorer).`
        }
      };
    }
  };
}

// src/tools/session-manager/index.ts
function createSessionManagerTool(context) {
  return {
    name: "session_manager",
    description: "Queries and manages Team-Shinchan session state.",
    parameters: [
      {
        name: "action",
        type: "string",
        description: "Action to perform: status, list_tasks, cancel_task",
        required: true
      },
      {
        name: "task_id",
        type: "string",
        description: "Task ID (required for cancel_task)",
        required: false
      }
    ],
    handler: async (params) => {
      const action = params.action;
      const taskId = params.task_id;
      switch (action) {
        case "status":
          return {
            success: true,
            output: {
              sessionId: context.sessionState.sessionId,
              messageCount: context.sessionState.messageCount,
              activeAgent: context.sessionState.activeAgent,
              activeSkill: context.sessionState.activeSkill,
              ralphLoopActive: context.sessionState.ralphLoopActive,
              ultraworkActive: context.sessionState.ultraworkActive,
              autopilotActive: context.sessionState.autopilotActive,
              todoCount: context.sessionState.todos.length,
              pendingTodos: context.sessionState.todos.filter((t) => t.status === "pending").length,
              backgroundTaskCount: getRunningBackgroundTasks(context.sessionState).length
            }
          };
        case "list_tasks":
          return {
            success: true,
            output: {
              backgroundTasks: context.sessionState.backgroundTasks,
              todos: context.sessionState.todos
            }
          };
        case "cancel_task":
          if (!taskId) {
            return {
              success: false,
              error: "task_id is required."
            };
          }
          const task = context.sessionState.backgroundTasks.find((t) => t.id === taskId);
          if (task) {
            task.status = "failed";
            task.endTime = new Date;
          }
          return {
            success: true,
            output: { cancelled: taskId }
          };
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`
          };
      }
    }
  };
}

// src/tools/memory-ops/index.ts
function createMemoryOpsTool(context) {
  return {
    name: "memory_ops",
    description: "Reads, writes, and searches memory. (read: read, write: write, search: search, reinforce: reinforce, contradict: contradict)",
    parameters: [
      {
        name: "operation",
        type: "string",
        description: "Task to perform: read, write, search, reinforce, contradict",
        required: true
      },
      {
        name: "memoryId",
        type: "string",
        description: "(read/reinforce/contradict) Memory ID",
        required: false
      },
      {
        name: "content",
        type: "string",
        description: "(write) Content to save",
        required: false
      },
      {
        name: "category",
        type: "string",
        description: "(write) Memory category: preference, pattern, context, mistake, decision, convention, insight",
        required: false
      },
      {
        name: "scope",
        type: "string",
        description: "(write) Memory scope: global, project (default: project)",
        required: false,
        default: "project"
      },
      {
        name: "tags",
        type: "array",
        description: "(write) Tags list",
        required: false
      },
      {
        name: "keyword",
        type: "string",
        description: "(search) search keyword",
        required: false
      },
      {
        name: "limit",
        type: "number",
        description: "(search) Maximum number of results (default: 5)",
        required: false,
        default: 5
      }
    ],
    handler: async (params) => {
      const manager = getMemoryManager();
      await manager.initialize();
      const operation = params.operation;
      switch (operation) {
        case "read": {
          const memoryId = params.memoryId;
          if (!memoryId) {
            return { success: false, error: "memoryId is required." };
          }
          const memory = await manager.read(memoryId);
          if (!memory) {
            return { success: false, error: `ID ${memoryId} memory not found.` };
          }
          return {
            success: true,
            output: JSON.stringify({
              id: memory.id,
              title: memory.title,
              content: memory.content,
              category: memory.category,
              confidence: memory.confidence,
              tags: memory.tags,
              createdAt: memory.createdAt
            }, null, 2)
          };
        }
        case "write": {
          const content = params.content;
          if (!content) {
            return { success: false, error: "content is required." };
          }
          const learning = createSimpleLearning(content, {
            category: params.category,
            scope: params.scope || "project",
            owner: context.sessionState?.lastAgent || undefined,
            tags: params.tags,
            source: "agent-memory-ops"
          });
          const memory = await manager.create(learning);
          return {
            success: true,
            output: JSON.stringify({
              id: memory.id,
              title: memory.title,
              message: "Memory has been saved."
            })
          };
        }
        case "search": {
          const keyword = params.keyword;
          const limit = params.limit || 5;
          const result = await manager.search({
            keyword,
            categories: params.category ? [params.category] : undefined,
            limit,
            sortBy: "relevance"
          });
          return {
            success: true,
            output: JSON.stringify({
              total: result.total,
              memories: result.memories.map((m) => ({
                id: m.id,
                title: m.title,
                content: m.content.slice(0, 100) + (m.content.length > 100 ? "..." : ""),
                category: m.category,
                confidence: m.confidence
              }))
            }, null, 2)
          };
        }
        case "reinforce": {
          const memoryId = params.memoryId;
          if (!memoryId) {
            return { success: false, error: "memoryId is required." };
          }
          const reinforced = await manager.reinforce(memoryId);
          if (!reinforced) {
            return { success: false, error: `ID ${memoryId} memory not found.` };
          }
          return {
            success: true,
            output: JSON.stringify({
              id: reinforced.id,
              title: reinforced.title,
              newConfidence: reinforced.confidence,
              reinforcementCount: reinforced.reinforcementCount,
              message: "Memory has been reinforced."
            })
          };
        }
        case "contradict": {
          const memoryId = params.memoryId;
          if (!memoryId) {
            return { success: false, error: "memoryId is required." };
          }
          const contradicted = await manager.contradict(memoryId);
          if (!contradicted) {
            return { success: false, error: `ID ${memoryId} memory not found.` };
          }
          return {
            success: true,
            output: JSON.stringify({
              id: contradicted.id,
              title: contradicted.title,
              newConfidence: contradicted.confidence,
              contradictionCount: contradicted.contradictionCount,
              message: "Memory has been marked as contradicted."
            })
          };
        }
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`
          };
      }
    }
  };
}

// src/tools/index.ts
function createBuiltinTools(context) {
  return [
    createDelegateTaskTool(context),
    createCallTeamAgentTool(context),
    createBackgroundTaskTool(context),
    createLookAtTool(context),
    createSkillTool(context),
    createSlashcommandTool(context),
    createInteractiveBashTool(context),
    createAstGrepTool(context),
    createLspDiagnosticsTool(context),
    createLspRenameTool(context),
    createLspReferencesTool(context),
    createSessionManagerTool(context),
    createMemoryOpsTool(context)
  ];
}

// src/features/builtin-skills/ultrawork/index.ts
function createUltraworkSkill(context) {
  return {
    name: "ultrawork",
    displayName: "Ultrawork",
    description: "Activates parallel execution mode to run multiple agents simultaneously.",
    triggers: ["ulw", "ultrawork", "parallel", "quickly", "parallel"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      activateUltrawork(sessionState);
      return {
        success: true,
        output: `\uD83D\uDE80 **Ultrawork Mode Activated**

Parallel execution mode has been activated.

## Activated Features
- Run multiple agents simultaneously
- Automatically utilize background tasks
- Process independent tasks in parallel

## Usage
Independent tasks are automatically executed in parallel.
Tasks with sequential dependencies are executed in order.

Maximum concurrent execution: ${context.settings.maxConcurrentAgents} units

To deactivate Ultrawork \`/cancel-ultrawork\`use .`,
        inject: `<ultrawork-mode>
Ultrawork mode has been activated.
Process parallelizable tasks concurrently.
Maximum concurrent agents: ${context.settings.maxConcurrentAgents} units
</ultrawork-mode>`
      };
    }
  };
}

// src/features/builtin-skills/ralph/index.ts
function createRalphSkill(context) {
  return {
    name: "ralph",
    displayName: "Ralph",
    description: "Repeats execution until task completion.",
    triggers: ["ralph", "until done", "until complete", "dont stop", "don't stop"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      activateRalphLoop(sessionState);
      return {
        success: true,
        output: `\uD83D\uDD04 **Ralph Mode Activated**

Task repeat until complete mode has been activated.

## How It Works
- Automatically continue until all TODOs are complete
- Notify of incomplete tasks when stopping
- Maximum retries: ${context.settings.maxRetries}times

## Current Task
${args || "Enter task content"}

To stop Ralph \`/cancel-ralph\`use .`,
        inject: `<ralph-mode>
Ralph mode has been activated.
Continue working until all TODOs are complete.
Automatically restarts if incomplete tasks exist.
</ralph-mode>`
      };
    }
  };
}

// src/features/builtin-skills/autopilot/index.ts
function createAutopilotSkill(context) {
  return {
    name: "autopilot",
    displayName: "Autopilot",
    description: "Autonomous execution mode - Ralph + Ultrawork combined",
    triggers: ["autopilot", "automatically", "automatically", "auto"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      activateAutopilot(sessionState);
      activateRalphLoop(sessionState);
      activateUltrawork(sessionState);
      return {
        success: true,
        output: `\uD83E\uDD16 **Autopilot Mode Activated**

Full autonomous execution mode has been activated.

## Activated Features
- ✅ Ralph: Repeat until task completion
- ✅ Ultrawork: Parallel execution
- ✅ Automatic agent delegation
- ✅ Automatic verification request

## Task Content
${args || "Enter task content"}

## How It Works
1. Requirements analysis (Misae)
2. Planning (Nene)
3. Implementation (Bo/specialist)
4. Verification (Action Kamen)
5. Repeat until complete

To stop Autopilot \`/cancel-autopilot\`use .`,
        inject: `<autopilot-mode>
Autopilot mode has been activated.
Complete tasks autonomously.
Ralph + Ultrawork have been activated together.
</autopilot-mode>`
      };
    }
  };
}

// src/features/builtin-skills/plan/index.ts
function createPlanSkill(context) {
  return {
    name: "plan",
    displayName: "Plan",
    description: "Starts planning session to organize requirements.",
    triggers: ["plan", "planning", "design", "planning"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "plan";
      return {
        success: true,
        output: `\uD83D\uDCCB **Start planning session**

Nene(Planner) establishes planning with.

## Project/Task
${args || "planning content to describe"}

## Process
1. **Requirements gathering**: Identify goals, constraints, priorities
2. **analysis**: Misae(Metis) analyzes hidden requirements
3. *Write planning*: Break down work by stage
4. **Review**: Action Kamen(Reviewer) Review

## Questions
Will ask a few questions to establish planning.

Nene(Planner)Delegating to ...`,
        inject: `<plan-mode>
planning  session has started.
Nene(Planner)Delegate to establish systematic planning.
delegate_task(agent="yuri", task="...")
</plan-mode>`
      };
    }
  };
}

// src/features/builtin-skills/analyze/index.ts
function createAnalyzeSkill(context) {
  return {
    name: "analyze",
    displayName: "Analyze",
    description: "Activates deep analysis mode.",
    triggers: ["analyze", "analysis", "debugging", "why not", "debug", "investigate"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "analyze";
      return {
        success: true,
        output: `\uD83D\uDD0D **Analysis mode Activated**

Hiroshi(Oracle)Performs deep analysis with .

## Analysis Target
${args || "analysis content to describe"}

## Analysis Approach
1. *Understand situation*: Accurately understand the problem situation
2. *Track cause*: Identify root cause
3. *Impact analysis*: Identify related code/features
4. *Solution*: Present options and recommendations

Hiroshi(Oracle)Delegating to ...`,
        inject: `<analyze-mode>
Analysis mode has been activated.
Hiroshi(Oracle)Delegate to perform deep analysis.
delegate_task(agent="shinhyungman", task="...")
</analyze-mode>`
      };
    }
  };
}

// src/features/builtin-skills/deepsearch/index.ts
function createDeepsearchSkill(context) {
  return {
    name: "deepsearch",
    displayName: "Deepsearch",
    description: "Explores codebase deeply.",
    triggers: ["deepsearch", "deep search", "find", "search"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "deepsearch";
      return {
        success: true,
        output: `\uD83D\uDD0E **Deepsearch Mode Activated**

Shiro(Explorer) and Masumi(Librarian) perform deep search together.

## Search Target
${args || "search content to describe"}

## Search Strategy
1. **Code exploration**: Shiro explores codebase
2. **Documentation search**: Masumi searches documentation/external information
3. **Compile results**: Organize discovered information

Starting search in parallel...`,
        inject: `<deepsearch-mode>
Deepsearch mode has been activated.
Shiro(Explorer)and Masumi(Librarian). Delegate in parallel.
</deepsearch-mode>`
      };
    }
  };
}

// src/features/builtin-skills/git-master/index.ts
function createGitMasterSkill(context) {
  return {
    name: "git-master",
    displayName: "Git-Master",
    description: "Activates Git expert mode.",
    triggers: ["commit", "push", "merge", "rebase", "git"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "git-master";
      return {
        success: true,
        output: `\uD83C\uDF3F **Git-Master Mode Activated**

Git expert mode.

## Git Guidelines
- Atomic commits (one purpose, one commit)
- Clear commit messages
- Follow branch strategy

## Commit Message Format
\`\`\`
<type>: <subject>

<body>

Co-Authored-By: Team-Seokan <noreply@team-seokan.dev>
\`\`\`

## Type
- feat: New feature
- fix: Bug fix
- refactor: Refactoring
- docs: Documentation
- test: Testing
- chore: Other`
      };
    }
  };
}

// src/features/builtin-skills/frontend-ui-ux/index.ts
function createFrontendUiUxSkill(context) {
  return {
    name: "frontend-ui-ux",
    displayName: "Frontend-UI-UX",
    description: "Activates UI/UX expert mode.",
    triggers: ["UI", "UX", "component", "style", "CSS", "component"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "frontend-ui-ux";
      return {
        success: true,
        output: `\uD83C\uDFA8 **Frontend-UI-UX Mode Activated**

Aichan(Frontend)Performs UI/UX work with .

## UI/UX Principles
- User-centered design
- Consider accessibility (a11y)
- Responsive design
- Consistent design system

## Task Content
${args || "UI/UX task content to describe"}

Aichan(Frontend)Delegating to ...`,
        inject: `<frontend-ui-ux-mode>
Frontend-UI-UX mode has been activated.
Delegate to Aichan (Frontend) to perform UI/UX tasks.
delegate_task(agent="suji", task="...")
</frontend-ui-ux-mode>`
      };
    }
  };
}

// src/features/builtin-skills/help/index.ts
function createHelpSkill(context) {
  return {
    name: "help",
    displayName: "Help",
    description: "Guides Team-Shinchan usage.",
    triggers: ["help", "Help", "usage"],
    autoActivate: false,
    handler: async () => {
      return {
        success: true,
        output: `# \uD83C\uDFAD Team-Seokan Help

## Agent Team (14 members)

### Orchestration
- **Shinnosuke**: Main Orchestrator
- **Himawari**: Large project coordination

### Execution
- **Bo**: Code writing/modification
- **Kazama**: Complex long-running tasks

### specialist
- **Aichan**: UI/UX Frontend
- **Bunta**: API/DB Backend
- **Masao**: DevOps Infrastructure

### Advisory (read only)
- **Hiroshi**: Strategic advice/debugging
- **Nene**: Planning
- **Misae**: Pre-analysis
- **Action Kamen**: Verification/review

### Exploration (read only)
- **Shiro**: Code exploration
- **Masumi**: Documentation search
- **Ume**: Image/PDF analysis

## Skills

| Skills | Trigger | Description |
|------|--------|------|
| ultrawork | ulw, parallel | Parallel execution mode |
| ralph | until done | Repeat until complete |
| autopilot | automatically | Autonomous execution |
| plan | planning | planning session |
| analyze | analysis | Deep analysis |
| deepsearch | find | Deep search |

## Usage Examples

\`\`\`
# Agent delegation
delegate_task(agent="maenggu", task="Add button component")

# Skills Execution
/team-seokan:ultrawork process quickly

# Background Execution
background_task(agent="heendungi", task="Find API endpoints")
\`\`\``
      };
    }
  };
}

// src/features/builtin-skills/cancel/index.ts
function createCancelSkill(context) {
  return {
    name: "cancel",
    displayName: "Cancel",
    description: "Cancels activated modes.",
    triggers: ["cancel", "cancel", "stop", "stop", "stop"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      const cancelTarget = args?.toLowerCase() || "all";
      const cancelled = [];
      if (cancelTarget === "all" || cancelTarget.includes("ralph")) {
        if (sessionState.ralphLoopActive) {
          deactivateRalphLoop(sessionState);
          cancelled.push("Ralph");
        }
      }
      if (cancelTarget === "all" || cancelTarget.includes("ultrawork")) {
        if (sessionState.ultraworkActive) {
          deactivateUltrawork(sessionState);
          cancelled.push("Ultrawork");
        }
      }
      if (cancelTarget === "all" || cancelTarget.includes("autopilot")) {
        if (sessionState.autopilotActive) {
          deactivateAutopilot(sessionState);
          deactivateRalphLoop(sessionState);
          deactivateUltrawork(sessionState);
          cancelled.push("Autopilot (Ralph + Ultrawork including)");
        }
      }
      sessionState.activeSkill = undefined;
      if (cancelled.length === 0) {
        return {
          success: true,
          output: `ℹ️ cancelNo active modes to cancel.`
        };
      }
      return {
        success: true,
        output: `⏹️ **Modes Cancelled**

Following modes have been cancelled:
${cancelled.map((c) => `- ${c}`).join(`
`)}

Returning to normal mode.`
      };
    }
  };
}

// src/features/builtin-skills/memories/index.ts
function formatMemory(memory, index) {
  const confidence = calculateEffectiveConfidence(memory);
  const confidenceStr = confidence >= 0.8 ? "⭐⭐⭐" : confidence >= 0.5 ? "⭐⭐" : "⭐";
  const date = memory.createdAt.toISOString().split("T")[0];
  const tags = memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(" ") : "";
  return `### ${index + 1}. ${memory.title}
- *Category*: ${memory.category}
- *Confidence*: ${confidenceStr} (${(confidence * 100).toFixed(0)}%)
- **Created**: ${date}
- *Tags*: ${tags || "None"}

> ${memory.content}
`;
}
function formatCategorySummary(stats, avgConfidence) {
  const lines = [];
  for (const [category, count] of stats) {
    lines.push(`- ${category}: ${count}items`);
  }
  return `## \uD83D\uDCCA Memory Statistics

**Total Memory Count**: ${Array.from(stats.values()).reduce((a, b) => a + b, 0)}items
**Average Confidence**: ${(avgConfidence * 100).toFixed(1)}%

### CategoryBy
${lines.join(`
`)}
`;
}
function createMemoriesSkill(context) {
  return {
    name: "memories",
    displayName: "Memories",
    description: "Queries learned memory.",
    triggers: ["memories", "memory", "learning content", "what did you learn"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      try {
        const manager = getMemoryManager();
        await manager.initialize();
        const lowerArgs = (args || "").toLowerCase();
        let category;
        let limit = 10;
        let showStats = false;
        const categories = [
          "preference",
          "pattern",
          "context",
          "mistake",
          "decision",
          "convention",
          "insight"
        ];
        for (const cat of categories) {
          if (lowerArgs.includes(cat)) {
            category = cat;
            break;
          }
        }
        if (lowerArgs.includes("stats") || lowerArgs.includes("stats")) {
          showStats = true;
        }
        const limitMatch = lowerArgs.match(/(\d+)items?/);
        if (limitMatch) {
          limit = parseInt(limitMatch[1], 10);
        }
        if (showStats) {
          const stats = await manager.getStats();
          return {
            success: true,
            output: `# \uD83E\uDDE0 Team-Seokan Memory Statistics

${formatCategorySummary(stats.byCategory, stats.averageConfidence)}

### By Agent
${Array.from(stats.byOwner.entries()).map(([owner, count]) => `- ${owner}: ${count}items`).join(`
`)}

### Popular Tags
${stats.topTags.slice(0, 5).map(([tag, count]) => `- #${tag}: ${count}times`).join(`
`)}
`
          };
        }
        const result = await manager.search({
          categories: category ? [category] : undefined,
          sortBy: "confidence",
          sortOrder: "desc",
          limit
        });
        if (result.memories.length === 0) {
          return {
            success: true,
            output: `# \uD83E\uDDE0 Learned Memory

No learned memories yet.

Learn automatically while performing tasks, or \`/learn "content"\`to teach directly.`
          };
        }
        const memoryList = result.memories.map((m, i) => formatMemory(m, i)).join(`
---

`);
        return {
          success: true,
          output: `# \uD83E\uDDE0 Learned Memory (${result.total}items out of ${result.memories.length}items)

${category ? `**Filter**: ${category}` : ""}

${memoryList}

---
\uD83D\uDCA1 To see more: \`/memories 20 items\`
\uD83D\uDCA1 By category: \`/memories preference\`
\uD83D\uDCA1 View stats: \`/memories stats\`
`
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ Memory query failed: ${error}`
        };
      }
    }
  };
}

// src/features/builtin-skills/forget/index.ts
function createForgetSkill(context) {
  return {
    name: "forget",
    displayName: "Forget",
    description: "Deletes specific memory.",
    triggers: ["forget", "forget", "delete", "delete memory"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      if (!args || args.trim() === "") {
        return {
          success: false,
          output: `# ❌ delete Target Required

\`/forget "keyword"\` format to specify memory to delete.

**Usage:**
- \`/forget naming\` - "naming" related memory deletion
- \`/forget preference\` - Delete all preference memories
- \`/forget all\` - Delete all memories (caution!)

\uD83D\uDCA1 First \`/memories\`to check current learned contents.`
        };
      }
      try {
        const manager = getMemoryManager();
        await manager.initialize();
        const keyword = args.trim();
        if (keyword.toLowerCase() === "all") {
          const stats = await manager.getStats();
          const totalBefore = stats.total;
          const allMemories = manager.getAllMemories();
          for (const memory of allMemories) {
            await manager.delete(memory.id);
          }
          return {
            success: true,
            output: `# \uD83D\uDDD1️ Full Memory Deletion

**${totalBefore}items**items have been deleted.

Learning has been reset. Will start learning from new tasks.`
          };
        }
        const deletedCount = await manager.forget(keyword);
        if (deletedCount === 0) {
          return {
            success: true,
            output: `# ℹ️ No Deletion Target

"${keyword}" related memory not found.

\uD83D\uDCA1 \`/memories\`to check current learned contents.`
          };
        }
        return {
          success: true,
          output: `# \uD83D\uDDD1️ Memory Deletion Complete

**${deletedCount}items** "${keyword}"  related items have been deleted.

This content will no longer affect agent behavior.`
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ Memory deletion failed: ${error}`
        };
      }
    }
  };
}

// src/features/builtin-skills/learn/index.ts
function parseLearnArgs(args) {
  let content = args;
  let category;
  let scope;
  const tags = [];
  const tagMatches = args.match(/#\w+/g);
  if (tagMatches) {
    tags.push(...tagMatches.map((t) => t.slice(1)));
    content = content.replace(/#\w+/g, "").trim();
  }
  const categoryMatch = args.match(/--category[=:]?\s*(\w+)/i);
  if (categoryMatch) {
    const cat = categoryMatch[1].toLowerCase();
    const validCategories = [
      "preference",
      "pattern",
      "context",
      "mistake",
      "decision",
      "convention",
      "insight"
    ];
    if (validCategories.includes(cat)) {
      category = cat;
    }
    content = content.replace(/--category[=:]?\s*\w+/i, "").trim();
  }
  if (args.includes("--global")) {
    scope = "global";
    content = content.replace(/--global/i, "").trim();
  } else if (args.includes("--project")) {
    scope = "project";
    content = content.replace(/--project/i, "").trim();
  }
  return { content, category, scope, tags };
}
function createLearnSkill(context) {
  return {
    name: "learn",
    displayName: "Learn",
    description: "Explicitly learns new contents.",
    triggers: ["learn", "learn", "remember", "remember this"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      if (!args || args.trim() === "") {
        return {
          success: false,
          output: `# ❌ Learning Content Required

\`/learn "content"\` format to enter content to learn.

**Usage:**
\`\`\`
/learn I always use .component.tsx use extension

/learn API errors always display in Korean #preference #api

/learn --category=convention variable names in camelCase

/learn --project --category=context This project uses Next.js 14
\`\`\`

**Options:**
- \`#tag\` - Tags add
- \`--category=xxx\` - Category specify (preference, pattern, convention, etc.)
- \`--global\` - Apply to all projects
- \`--project\` - Apply to current project only (default)`
        };
      }
      try {
        const manager = getMemoryManager();
        await manager.initialize();
        const { content, category, scope, tags } = parseLearnArgs(args);
        if (!content) {
          return {
            success: false,
            output: "❌ Learning content is empty."
          };
        }
        const learning = createSimpleLearning(content, {
          category,
          scope: scope || "project",
          tags,
          source: "explicit-learn"
        });
        learning.confidence = 0.9;
        const memory = await manager.create(learning);
        return {
          success: true,
          output: `# ✅ Learning Complete!

**Title**: ${memory.title}
*Category*: ${memory.category}
**Scope**: ${memory.scope === "global" ? "Global (all projects)" : "Project-specific"}
*Tags*: ${memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(" ") : "None"}

> ${memory.content}

---
This content will be reflected in agent behavior going forward.

\uD83D\uDCA1 Check learned contents: \`/memories\`
\uD83D\uDCA1 Delete learning: \`/forget "${memory.title.slice(0, 10)}..."\``
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ Learning failed: ${error}`
        };
      }
    }
  };
}

// src/features/builtin-skills/debate/index.ts
var DEBATE_PARTICIPANTS = {
  frontend: ["aichan", "hiroshi"],
  backend: ["bunta", "hiroshi"],
  devops: ["masao", "hiroshi"],
  architecture: ["hiroshi", "nene", "misae"],
  fullstack: ["aichan", "bunta", "masao", "hiroshi"],
  default: ["hiroshi", "misae"]
};
function analyzeTopicForParticipants(topic) {
  const lowerTopic = topic.toLowerCase();
  if (/ui|ux|front|frontend|component|component|react|css|style/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.frontend;
  }
  if (/api|Backend|backend|db|database|server|server|graphql|rest/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.backend;
  }
  if (/deploy|deploy|Infrastructure|infra|devops|ci|cd|docker|k8s/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.devops;
  }
  if (/architecture|architecture|design|design|structure|system/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.architecture;
  }
  if (/entire|fullstack|fullstack|integration/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.fullstack;
  }
  return DEBATE_PARTICIPANTS.default;
}
var AGENT_DISPLAY_NAMES2 = {
  shinnosuke: "Shinnosuke",
  himawari: "Himawari",
  bo: "Bo",
  kazama: "Kazama",
  aichan: "Aichan",
  bunta: "Bunta",
  masao: "Masao",
  hiroshi: "Hiroshi",
  nene: "Nene",
  misae: "Misae",
  actionkamen: "Action Kamen",
  shiro: "Shiro",
  masumi: "Masumi",
  ume: "Ume",
  midori: "Midori"
};
var AGENT_ROLES2 = {
  shinnosuke: "Orchestrator",
  himawari: "Atlas",
  bo: "Executor",
  kazama: "Hephaestus",
  aichan: "Frontend",
  bunta: "Backend",
  masao: "DevOps",
  hiroshi: "Oracle",
  nene: "Planner",
  misae: "Metis",
  actionkamen: "Reviewer",
  shiro: "Explorer",
  masumi: "Librarian",
  ume: "Multimodal",
  midori: "Moderator"
};
function createDebateSkill(context) {
  return {
    name: "debate",
    displayName: "Debate",
    description: "Find optimal solutions through agent debates.",
    triggers: ["debate", "debate", "opinion", "discussion", "pros and cons", "comparison"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      const topic = args || "Please enter a debate topic";
      const participants = analyzeTopicForParticipants(topic);
      sessionState.activeSkill = "debate";
      sessionState.debateActive = true;
      sessionState.debateRound = 0;
      sessionState.debateMaxRounds = 3;
      sessionState.debateParticipants = participants;
      sessionState.debateTopic = topic;
      const participantList = participants.map((p) => `- **${AGENT_DISPLAY_NAMES2[p]}** (${AGENT_ROLES2[p]})`).join(`
`);
      return {
        success: true,
        output: `\uD83D\uDDE3️ **Debate Session Started**

## Topic
${topic}

## Participating Agents
${participantList}

## Debate Process

### Phase 1: Opinion Collection
Each expert presents their perspective.

### Phase 2: Mutual Feedback (Max 3 rounds)
Exchange feedback and rebuttals on opinions.

### Phase 3: Consensus Building
Hiroshi(Oracle) synthesizes all opinions for final recommendation.

### Phase 4: Verification
Action Kamen(Reviewer) reviews the consensus.

---

**Midori conducts the debate.**`,
        inject: `<debate-mode>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 EXECUTE IMMEDIATELY: Debate Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 1: Call Midori to Conduct Debate

You MUST immediately delegate this debate to Midori using the Task tool.

Task(
  subagent_type="team-shinchan:midori",
  model="opus",
  prompt="Please conduct the debate.

## Topic
${topic}

## Panel
${participants.map(p => `- ${AGENT_DISPLAY_NAMES2[p]} (${AGENT_ROLES2[p]})`).join('\n')}

## Process
1. Output debate start announcement
2. Collect opinions from each panel (parallel Task calls)
3. Real-time output of each opinion
4. Request consensus from Hiroshi
5. Output final decision

## Output Format
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate in Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Topic: {Topic}
👥 Panel: {Panel list}

🎤 Round 1: Opinion Collection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Each agent opinion]

✅ Recommended Decision
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Decision: {decision}
📝 Rationale: {rationale}

IMPORTANT: Execute debate immediately and return results to Shinnosuke."
)

## Step 2: Relay Results to User

After receiving Midori's result, you MUST present it to the user in this format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate Result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Topic: ${topic}

🎤 Expert opinions:
[Summarize each panelist's opinion concisely]
${participants.map(p => `- [${AGENT_DISPLAY_NAMES2[p]}]: {opinion summary}`).join('\n')}

✅ Recommended Decision: {Conclusion presented by Midori}
📝 Rationale: {decision rationale}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 3: Ask for User's Decision

After presenting the results, ask the user:

"Do you agree with the above recommended decision? Please let me know if you have other opinions or additional considerations."

## Step 4: Finalize Decision

- If user agrees: Document the decision and proceed
- If user has concerns: Address them and refine the decision
- Never proceed without user confirmation

CRITICAL:
- Use the Task tool to call team-shinchan:midori
- Wait for Midori's complete response
- Present results clearly to user
- Get user confirmation before proceeding
- DO NOT make final decisions without user input
</debate-mode>`
      };
    }
  };
}

// src/features/builtin-skills/index.ts
function createBuiltinSkills(context) {
  return [
    createUltraworkSkill(context),
    createRalphSkill(context),
    createAutopilotSkill(context),
    createPlanSkill(context),
    createAnalyzeSkill(context),
    createDeepsearchSkill(context),
    createGitMasterSkill(context),
    createFrontendUiUxSkill(context),
    createHelpSkill(context),
    createCancelSkill(context),
    createMemoriesSkill(context),
    createForgetSkill(context),
    createLearnSkill(context),
    createDebateSkill(context)
  ];
}

// src/index.ts
async function TeamSeokanPlugin(ctx) {
  const settings = await loadPluginConfig();
  const sessionState = createSessionState();
  const pluginContext = {
    settings,
    sessionState,
    agents: new Map,
    hooks: new Map,
    tools: new Map,
    skills: new Map
  };
  const agents = await createBuiltinAgents(settings);
  for (const agent of agents) {
    pluginContext.agents.set(agent.name, agent);
  }
  const hooks = createBuiltinHooks(settings, pluginContext);
  for (const hook of hooks) {
    if (!settings.disabledHooks?.includes(hook.name)) {
      pluginContext.hooks.set(hook.name, hook);
    }
  }
  const tools = createBuiltinTools(pluginContext);
  for (const tool of tools) {
    pluginContext.tools.set(tool.name, tool);
  }
  const skills = createBuiltinSkills(pluginContext);
  for (const skill of skills) {
    if (!settings.disabledSkills?.includes(skill.name)) {
      pluginContext.skills.set(skill.name, skill);
    }
  }
  console.log(`[Team-Seokan] Plugin initialization complete`);
  console.log(`[Team-Seokan] Agents: ${pluginContext.agents.size}items`);
  console.log(`[Team-Seokan] Hooks: ${pluginContext.hooks.size}items`);
  console.log(`[Team-Seokan] Tools: ${pluginContext.tools.size}items`);
  console.log(`[Team-Seokan] Skills: ${pluginContext.skills.size}items`);
  return {
    name: "team-seokan",
    version: "0.1.0",
    context: pluginContext,
    agents: Array.from(pluginContext.agents.values()),
    hooks: Array.from(pluginContext.hooks.values()),
    tools: Array.from(pluginContext.tools.values()),
    skills: Array.from(pluginContext.skills.values()),
    handlers: {
      "session.created": async (event) => {
        pluginContext.sessionState = createSessionState();
        console.log("[Team-Seokan] New session started");
      },
      "session.deleted": async (event) => {
        console.log("[Team-Seokan] Session terminated");
      },
      "chat.message": async (message) => {
        pluginContext.sessionState.messageCount++;
        if (pluginContext.sessionState.messageCount >= settings.contextWarningThreshold) {
          console.log("[Team-Seokan] ⚠️ Context usage warning");
        }
      },
      "tool.execute.before": async (toolName, input) => {
        const name = toolName;
        for (const hook of pluginContext.hooks.values()) {
          if (hook.event === "tool.execute.before") {
            if (!hook.matchTools || hook.matchTools.includes(name)) {
              await hook.handler({
                event: "tool.execute.before",
                toolName: name,
                toolInput: input,
                sessionState: pluginContext.sessionState
              });
            }
          }
        }
      },
      "tool.execute.after": async (toolName, input, output) => {
        const name = toolName;
        for (const hook of pluginContext.hooks.values()) {
          if (hook.event === "tool.execute.after") {
            if (!hook.matchTools || hook.matchTools.includes(name)) {
              await hook.handler({
                event: "tool.execute.after",
                toolName: name,
                toolInput: input,
                toolOutput: output,
                sessionState: pluginContext.sessionState
              });
            }
          }
        }
      },
      error: async (error) => {
        console.error("[Team-Seokan] Error:", error);
      }
    },
    config: {
      get: () => settings,
      update: async (newSettings) => {
        Object.assign(settings, newSettings);
      }
    }
  };
}
var src_default = TeamSeokanPlugin;
export {
  src_default as default,
  TeamSeokanPlugin
};
