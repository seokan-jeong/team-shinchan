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
  ultrawork: ["ulw", "ultrawork", "병렬", "빠르게", "parallel"],
  ralph: ["ralph", "끝까지", "완료할 때까지", "dont stop", "don't stop"],
  autopilot: ["autopilot", "자동으로", "알아서", "auto"],
  plan: ["plan", "계획", "설계", "planning"],
  analyze: ["analyze", "분석", "디버깅", "왜 안", "debug", "investigate"],
  deepsearch: ["deepsearch", "깊은검색", "찾아줘", "search"],
  debate: ["debate", "토론", "의견", "논의", "장단점", "비교", "어떤 방법"],
  "git-master": ["commit", "push", "merge", "rebase", "git"],
  "frontend-ui-ux": ["UI", "UX", "컴포넌트", "스타일", "CSS", "component"],
  cancel: ["cancel", "취소", "중단", "stop", "멈춰"]
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
      delegationTriggers: ["대규모", "large", "complex", "복잡한"],
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
      delegationTriggers: ["구현", "코드", "작성", "수정", "implement", "code", "write"],
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
      delegationTriggers: ["복잡한", "장시간", "complex", "refactor", "리팩토링"],
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
      delegationTriggers: ["UI", "UX", "프론트", "frontend", "컴포넌트", "component", "CSS", "스타일"],
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
      delegationTriggers: ["API", "백엔드", "backend", "DB", "database", "서버", "server"],
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
      delegationTriggers: ["배포", "deploy", "CI", "CD", "Docker", "인프라", "infra", "k8s"],
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
      delegationTriggers: ["조언", "advice", "전략", "strategy", "디버깅", "debug", "왜 안돼"],
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
      delegationTriggers: ["계획", "plan", "설계", "design"],
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
      delegationTriggers: ["분석", "analyze", "확인", "고려사항"],
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
      delegationTriggers: ["검토", "review", "리뷰", "확인", "verify"],
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
      delegationTriggers: ["찾아줘", "find", "어디있어", "search", "검색"],
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
      delegationTriggers: ["문서", "docs", "API 문서", "documentation"],
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
      delegationTriggers: ["이미지", "image", "PDF", "스크린샷", "screenshot"],
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
      delegationTriggers: ["토론", "debate", "의견", "논의", "장단점", "비교"],
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
    description: "TODO가 완료되지 않으면 세션 종료를 방지합니다.",
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
          message: `⚠️ 최대 재시도 횟수(${maxRetries})에 도달했습니다. 미완료 TODO가 있지만 종료를 허용합니다.`
        };
      }
      retryCount++;
      const todoList = [
        ...inProgressTodo ? [`\uD83D\uDD04 진행 중: ${inProgressTodo.content}`] : [],
        ...pendingTodos.map((t) => `⏳ 대기 중: ${t.content}`)
      ].join(`
`);
      return {
        continue: false,
        message: `\uD83D\uDEAB **TODO 강제 실행**

미완료 작업이 있어 종료할 수 없습니다. (시도 ${retryCount}/${maxRetries})

${todoList}

계속 진행하거나, \`/cancel\`로 명시적으로 취소하세요.`,
        inject: `<system-reminder>
미완료 TODO가 있습니다. 작업을 계속하세요.
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
    description: "컨텍스트 윈도우 사용량을 모니터링합니다.",
    enabled: true,
    priority: 60,
    handler: async (hookContext) => {
      const state = context.sessionState;
      const threshold = context.settings.contextWarningThreshold;
      state.messageCount++;
      if (state.messageCount === threshold) {
        return {
          continue: true,
          message: `⚠️ **컨텍스트 경고**

메시지 수가 ${threshold}개에 도달했습니다.
긴 세션에서는 컨텍스트가 압축될 수 있습니다.

중요한 정보는 TODO나 파일에 저장하는 것을 권장합니다.`
        };
      }
      if (state.messageCount === Math.floor(threshold * 1.5)) {
        return {
          continue: true,
          message: `\uD83D\uDEA8 **컨텍스트 심각 경고**

메시지 수가 ${state.messageCount}개입니다.
곧 컨텍스트 압축이 발생할 수 있습니다.

- 중요한 컨텍스트는 파일에 저장하세요
- 완료된 작업은 정리하세요
- 필요시 새 세션을 시작하세요`
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
    description: "컨텍스트가 가득 차기 전에 선제적으로 압축을 제안합니다.",
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
    description: "너무 긴 도구 출력을 잘라냅니다.",
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
    description: "빈 작업 응답을 감지하고 재시도를 권장합니다.",
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
    description: "과도한 주석 사용을 감지하고 경고합니다.",
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
    description: "편집 오류 발생 시 복구를 시도합니다.",
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
    description: "사용자 메시지에서 키워드를 감지하여 적절한 스킬을 추천합니다.",
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
        ultrawork: "\uD83D\uDE80 **Ultrawork** 모드를 활성화합니다. 병렬 실행으로 빠르게 처리합니다.",
        ralph: "\uD83D\uDD04 **Ralph** 모드를 활성화합니다. 작업이 완료될 때까지 계속합니다.",
        autopilot: "\uD83E\uDD16 **Autopilot** 모드를 활성화합니다. 자율적으로 작업을 수행합니다.",
        plan: "\uD83D\uDCCB **Plan** 세션을 시작합니다. 요구사항을 파악하겠습니다.",
        analyze: "\uD83D\uDD0D **Analyze** 모드를 활성화합니다. 심층 분석을 수행합니다.",
        deepsearch: "\uD83D\uDD0E **Deepsearch** 모드를 활성화합니다. 코드베이스를 깊이 탐색합니다.",
        "git-master": "\uD83C\uDF3F **Git-Master** 모드를 활성화합니다.",
        "frontend-ui-ux": "\uD83C\uDFA8 **Frontend-UI-UX** 모드를 활성화합니다.",
        cancel: "⏹️ 현재 모드를 취소합니다."
      };
      return {
        continue: true,
        modified: true,
        message: skillMessages[topSkill.skill] || `스킬 '${topSkill.skill}'을 감지했습니다.`,
        inject: `<intent-gate>
감지된 키워드: "${topSkill.keyword}"
추천 스킬: ${topSkill.skill}
자동 활성화: 예
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
    description: "Team-Seokan 규칙을 컨텍스트에 주입합니다.",
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
    description: "현재 디렉토리의 AGENTS.md를 컨텍스트에 주입합니다.",
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
    description: "실행 중인 배경 작업이 있으면 경고합니다.",
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
        message: `⚠️ **배경 작업 실행 중**

다음 배경 작업이 아직 실행 중입니다:
${taskList}

결과를 확인하려면 \`session_manager(action="list_tasks")\`를 사용하세요.`
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
    description: "코드 변경 후 액션가면(Reviewer)에게 검증을 권장합니다.",
    enabled: true,
    priority: 70,
    matchTools: ["Edit", "Write"],
    handler: async (hookContext) => {
      editCount++;
      if (editCount >= editThreshold) {
        editCount = 0;
        return {
          continue: true,
          message: `\uD83D\uDCCB **검증 권장**

${editThreshold}번의 코드 변경이 있었습니다.
액션가면(Reviewer)에게 검증을 권장합니다.

\`delegate_task(agent="actiongamen", task="최근 변경사항을 검토해주세요")\``,
          inject: `<reviewer-reminder>
여러 코드 변경이 있었습니다.
액션가면(Reviewer)에게 검증을 위임하는 것을 고려하세요.
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
    description: "Ralph 모드가 활성화되면 작업 완료까지 계속 실행합니다.",
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
          message: `\uD83D\uDD04 **Ralph Loop 활성화**

작업이 아직 완료되지 않았습니다. 계속 진행합니다.

Ralph를 중단하려면 \`/cancel-ralph\`를 사용하세요.`,
          inject: `<system-reminder>
Ralph Loop가 활성화되어 있습니다.
모든 TODO가 완료될 때까지 작업을 계속하세요.
</system-reminder>`
        };
      }
      state.ralphLoopActive = false;
      return {
        continue: true,
        message: `✅ **Ralph Loop 완료**

모든 작업이 완료되었습니다. Ralph 모드를 종료합니다.`
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
          patterns.push("컴포넌트 파일: *.component.{ext} 패턴");
        }
        if (fileName.includes(".service.")) {
          patterns.push("서비스 파일: *.service.{ext} 패턴");
        }
        if (fileName.includes(".test.") || fileName.includes(".spec.")) {
          patterns.push("테스트 파일: *.test.{ext} 또는 *.spec.{ext} 패턴");
        }
        if (fileName.match(/^[A-Z]/)) {
          patterns.push("PascalCase 파일명 사용");
        }
        if (fileName.match(/^[a-z]+(-[a-z]+)*\./)) {
          patterns.push("kebab-case 파일명 사용");
        }
      }
      if (patterns.length === 0)
        return null;
      return {
        title: "파일 네이밍 컨벤션",
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
        title: "프로젝트 폴더 구조",
        content: `사용된 폴더:
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
        title: `자주 하는 작업: ${taskType}`,
        content: `${taskType} 작업 완료. 설명: ${result.description}`,
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
        title: `${result.agent} 에이전트 작업 성공`,
        content: `${result.agent}가 "${result.description}" 작업을 성공적으로 완료함.${taskType ? ` 작업 유형: ${taskType}` : ""}`,
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
        title: "에러 복구 경험",
        content: `발생한 에러:
${result.errors.map((e) => `- ${e}`).join(`
`)}

해결됨.`,
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
        title: "실패한 접근 방식",
        content: `작업 "${result.description}"이 실패함.
에러: ${result.errors.join(", ") || "알 수 없음"}`,
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
    [/컴포넌트|component|ui|버튼|button|모달|modal/i, "UI 컴포넌트"],
    [/api|엔드포인트|endpoint|rest|graphql/i, "API"],
    [/테스트|test|spec/i, "테스트"],
    [/리팩토|refactor/i, "리팩토링"],
    [/버그|bug|fix|수정/i, "버그 수정"],
    [/스타일|style|css|tailwind/i, "스타일링"],
    [/배포|deploy|ci|cd/i, "배포"],
    [/문서|doc|readme/i, "문서화"],
    [/설정|config|설치/i, "설정"]
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
  if (/선호|prefer|좋아|싫어|always|never/i.test(lower)) {
    return "preference";
  }
  if (/패턴|pattern|반복|workflow/i.test(lower)) {
    return "pattern";
  }
  if (/아키텍처|구조|기술 스택|framework/i.test(lower)) {
    return "context";
  }
  if (/실수|mistake|에러|error|주의/i.test(lower)) {
    return "mistake";
  }
  if (/결정|decision|선택|chose/i.test(lower)) {
    return "decision";
  }
  if (/컨벤션|convention|규칙|rule/i.test(lower)) {
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
    "선호",
    "prefer",
    "좋아",
    "like",
    "싫어",
    "dislike",
    "항상",
    "always",
    "절대",
    "never",
    "보통",
    "usually",
    "스타일",
    "style",
    "방식",
    "way",
    "습관",
    "habit"
  ],
  pattern: [
    "패턴",
    "pattern",
    "반복",
    "repeat",
    "워크플로우",
    "workflow",
    "자주",
    "often",
    "매번",
    "every time",
    "일반적으로",
    "typically",
    "프로세스",
    "process",
    "순서",
    "sequence",
    "단계",
    "step"
  ],
  context: [
    "아키텍처",
    "architecture",
    "구조",
    "structure",
    "기술 스택",
    "tech stack",
    "프레임워크",
    "framework",
    "라이브러리",
    "library",
    "의존성",
    "dependency",
    "설정",
    "config",
    "환경",
    "environment",
    "인프라",
    "infrastructure"
  ],
  mistake: [
    "실수",
    "mistake",
    "에러",
    "error",
    "버그",
    "bug",
    "주의",
    "caution",
    "조심",
    "careful",
    "피해야",
    "avoid",
    "문제",
    "problem",
    "이슈",
    "issue",
    "오류",
    "fault"
  ],
  decision: [
    "결정",
    "decision",
    "선택",
    "choice",
    "채택",
    "adopt",
    "이유",
    "reason",
    "왜냐하면",
    "because",
    "근거",
    "rationale",
    "트레이드오프",
    "tradeoff",
    "대안",
    "alternative",
    "비교",
    "compare"
  ],
  convention: [
    "컨벤션",
    "convention",
    "규칙",
    "rule",
    "가이드라인",
    "guideline",
    "표준",
    "standard",
    "형식",
    "format",
    "명명",
    "naming",
    "린트",
    "lint",
    "포맷",
    "format",
    "코드 스타일",
    "code style"
  ],
  insight: [
    "발견",
    "discover",
    "알게 됨",
    "learned",
    "흥미로운",
    "interesting",
    "참고",
    "note",
    "팁",
    "tip",
    "트릭",
    "trick",
    "최적화",
    "optimize",
    "개선",
    "improve",
    "효율",
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
      title: `성공: ${result.description.slice(0, 50)}`,
      content: `${result.agent} 에이전트가 작업 완료.`,
      category: "pattern",
      scope: "project",
      owner: result.agent,
      confidence: 0.5,
      tags: ["success", "quick"],
      sources: [result.taskId]
    });
  } else {
    learnings.push({
      title: `실패: ${result.description.slice(0, 50)}`,
      content: `작업 실패. 에러: ${result.errors.slice(0, 2).join(", ")}`,
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
    improvements.push(`에러 방지: ${result.errors[0]}`);
  }
  if (result.duration > 10 * 60 * 1000) {
    improvements.push("작업 시간 단축 방법 모색");
  }
  const confirmedPatterns = [];
  if (result.success && result.codeChanges.length > 0) {
    const languages = [...new Set(result.codeChanges.map((c) => c.language))];
    confirmedPatterns.push(`${languages.join(", ")} 작업 패턴`);
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
      title: "아키텍처 결정",
      content: `파일 구조 분석:
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
      title: "에러 패턴 분석",
      content: `발생한 에러 유형:
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
    improvements.push(`에러 패턴 인식 및 사전 방지`);
    improvements.push(`테스트 케이스 추가: ${result.errors.length}개 에러 커버`);
  }
  if (result.duration > 20 * 60 * 1000) {
    improvements.push("작업 분할 고려: 더 작은 단위로 나누기");
  }
  if (result.codeChanges.filter((c) => c.changeType === "modify").length > 3) {
    improvements.push("리팩토링 기회: 관련 코드 그룹화");
  }
  const confirmedPatterns = [];
  if (result.success) {
    confirmedPatterns.push(`${result.agent} 에이전트 효과적인 작업 유형`);
    const changeTypes = [...new Set(result.codeChanges.map((c) => c.changeType))];
    if (changeTypes.length > 0) {
      confirmedPatterns.push(`작업 유형: ${changeTypes.join(", ")}`);
    }
  }
  if (result.context && Object.keys(result.context).length > 0) {
    learnings.push({
      title: "작업 컨텍스트",
      content: `중요 컨텍스트: ${JSON.stringify(result.context, null, 2)}`,
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
    return `타입 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes("syntax") || lower.includes("parse")) {
    return `구문 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes("not found") || lower.includes("undefined") || lower.includes("null")) {
    return `참조 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes("permission") || lower.includes("access")) {
    return `권한 에러: ${error.slice(0, 100)}`;
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("http")) {
    return `네트워크 에러: ${error.slice(0, 100)}`;
  }
  return `기타 에러: ${error.slice(0, 100)}`;
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
  lines.push(`## 회고: ${reflection.taskDescription}`);
  lines.push(`- 결과: ${reflection.success ? "✅ 성공" : "❌ 실패"}`);
  lines.push(`- 깊이: ${reflection.depth}`);
  if (reflection.learnings.length > 0) {
    lines.push(`
### 학습 (${reflection.learnings.length}개)`);
    for (const learning of reflection.learnings.slice(0, 5)) {
      lines.push(`- [${learning.category}] ${learning.title}`);
    }
  }
  if (reflection.improvements.length > 0) {
    lines.push(`
### 개선점`);
    for (const improvement of reflection.improvements) {
      lines.push(`- ${improvement}`);
    }
  }
  if (reflection.confirmedPatterns.length > 0) {
    lines.push(`
### 확인된 패턴`);
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
- **내용**: ${memory.content}
- **카테고리**: ${memory.category}
- **신뢰도**: ${memory.confidence.toFixed(2)}
- **출처**: ${sources}
- **태그**: ${tags}
- **감쇠**: ${memory.decayFactor.toFixed(2)}
- **강화 횟수**: ${memory.reinforcementCount}
- **반박 횟수**: ${memory.contradictionCount}
- **접근 횟수**: ${memory.accessCount}
- **마지막 접근**: ${memory.lastAccessedAt.toISOString()}
- **업데이트**: ${memory.updatedAt.toISOString()}
`;
}
function markdownToMemory(markdown, scope) {
  try {
    const idMatch = markdown.match(/- \*\*ID\*\*: (.+)/);
    const titleMatch = markdown.match(/## \[.+\] (.+)/);
    const contentMatch = markdown.match(/- \*\*내용\*\*: (.+)/);
    const categoryMatch = markdown.match(/- \*\*카테고리\*\*: (.+)/);
    const confidenceMatch = markdown.match(/- \*\*신뢰도\*\*: (.+)/);
    const sourcesMatch = markdown.match(/- \*\*출처\*\*: (.+)/);
    const tagsMatch = markdown.match(/- \*\*태그\*\*: (.+)/);
    const decayMatch = markdown.match(/- \*\*감쇠\*\*: (.+)/);
    const reinforcementMatch = markdown.match(/- \*\*강화 횟수\*\*: (.+)/);
    const contradictionMatch = markdown.match(/- \*\*반박 횟수\*\*: (.+)/);
    const accessCountMatch = markdown.match(/- \*\*접근 횟수\*\*: (.+)/);
    const lastAccessMatch = markdown.match(/- \*\*마지막 접근\*\*: (.+)/);
    const updatedMatch = markdown.match(/- \*\*업데이트\*\*: (.+)/);
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
> 자동 생성된 메모리 파일입니다. 직접 수정하지 마세요.
> 마지막 업데이트: ${new Date().toISOString()}

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
        description: `기존 메모리와 거의 동일한 내용입니다. (유사도: ${(overallSimilarity * 100).toFixed(1)}%)`
      };
    }
    return {
      existing,
      incoming,
      type: "update",
      description: `기존 메모리의 업데이트로 보입니다. (유사도: ${(overallSimilarity * 100).toFixed(1)}%)`
    };
  }
  if (overallSimilarity > 0.5 && titleSimilarity > 0.6) {
    const contradictionIndicators = ["아니", "않", "반대", "대신", "말고", "not", "don't", "instead"];
    const hasContradiction = contradictionIndicators.some((indicator) => incoming.content.toLowerCase().includes(indicator) || existing.content.toLowerCase().includes(indicator));
    if (hasContradiction) {
      return {
        existing,
        incoming,
        type: "contradiction",
        description: `기존 메모리와 상충되는 내용일 수 있습니다. (유사도: ${(overallSimilarity * 100).toFixed(1)}%)`
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
        reason: "중복된 내용이므로 기존 메모리를 유지하고 강화합니다."
      };
    case "update":
      const existingEffectiveConfidence = calculateEffectiveConfidence(existing);
      const incomingConfidence = incoming.confidence ?? 0.5;
      if (incomingConfidence >= existingEffectiveConfidence) {
        return {
          action: "replace",
          reason: `새 메모리의 신뢰도(${incomingConfidence.toFixed(2)})가 기존(${existingEffectiveConfidence.toFixed(2)})보다 높거나 같으므로 교체합니다.`
        };
      } else {
        return {
          action: "merge",
          mergedMemory: mergeMemories(existing, incoming),
          reason: `기존 메모리의 신뢰도가 더 높으므로 정보를 병합합니다.`
        };
      }
    case "contradiction":
      return {
        action: "replace",
        reason: "최신 우선 원칙에 따라 새 메모리로 교체합니다. 기존 메모리는 반박으로 처리됩니다."
      };
    default:
      return {
        action: "keep_both",
        reason: "충돌 유형을 판단할 수 없어 둘 다 유지합니다."
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

[업데이트 ${now.toISOString().split("T")[0]}]
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
  const success = !toolOutput.toLowerCase().includes("error") && !toolOutput.toLowerCase().includes("failed") && !toolOutput.toLowerCase().includes("실패");
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
    description: "작업 완료 후 자동 회고를 실행합니다.",
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
            context: `${action.context.taskDescription || ""} - ${analysis.changeType} 변경`,
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
        context: action.context.taskDescription || "사용자가 변경을 거부함",
        timestamp: action.timestamp
      };
    case "accept":
      return {
        type: "acceptance",
        original: action.context.originalContent || "",
        agent: action.context.agent || "shared",
        context: action.context.taskDescription || "사용자가 변경을 승인함",
        timestamp: action.timestamp
      };
    case "retry":
      return {
        type: "correction",
        original: action.context.errorMessage || action.context.originalContent || "",
        agent: action.context.agent || "shared",
        context: "사용자가 재시도를 요청함",
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
            title: "코딩 스타일 선호",
            content: `사용자가 코드 스타일을 수정함. 변경된 요소: ${analysis.changedElements.join(", ")}`,
            category: "preference",
            scope: "global",
            owner: feedback.agent,
            confidence: analysis.confidence * 0.8,
            tags: ["style", "preference", ...analysis.changedElements],
            sources: [feedback.timestamp.toISOString()]
          });
        } else if (analysis.changeType === "naming") {
          learnings.push({
            title: "네이밍 선호",
            content: `사용자가 변수/함수명을 수정함.`,
            category: "preference",
            scope: "project",
            owner: feedback.agent,
            confidence: analysis.confidence * 0.9,
            tags: ["naming", "convention"],
            sources: [feedback.timestamp.toISOString()]
          });
        } else if (analysis.changeType === "logic") {
          learnings.push({
            title: "로직 수정",
            content: `사용자가 ${feedback.agent} 에이전트의 로직을 수정함. 컨텍스트: ${feedback.context}`,
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
        title: "거부된 접근 방식",
        content: `사용자가 ${feedback.agent} 에이전트의 제안을 거부함. 컨텍스트: ${feedback.context}`,
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
        title: "승인된 접근 방식",
        content: `사용자가 ${feedback.agent} 에이전트의 작업을 승인함. 컨텍스트: ${feedback.context}`,
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
        title: "수정 필요했던 작업",
        content: `재시도가 요청됨. 원래 결과: ${feedback.original}`,
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
        taskDescription: `${filePath} 수정`
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
          taskDescription: `명령 실행: ${command}`
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
    description: "사용자의 수정/거부 행동에서 암묵적 피드백을 감지합니다.",
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
          message: `\uD83D\uDCA1 암묵적 피드백 학습됨: ${extraction.learnings[0]?.title || ""}`
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
  const header = `## 학습된 컨텍스트
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
  if (injection.summary.trim() === "## 학습된 컨텍스트") {
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
    "이",
    "그",
    "저",
    "것",
    "를",
    "을",
    "에",
    "의",
    "가",
    "는",
    "은",
    "와",
    "과",
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
    description: "에이전트 실행 전 학습된 메모리를 주입합니다.",
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
    description: "세션 시작 시 메모리 시스템을 초기화합니다.",
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
          message: isFirstRun ? "\uD83E\uDDE0 메모리 시스템 초기화됨" : undefined
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
    description: `에이전트에게 작업을 위임합니다.

사용 가능한 에이전트:
- jjangu (짱구): 오케스트레이터
- jjanga (짱아): 마스터 오케스트레이터
- maenggu (맹구): 코드 작성/수정
- cheolsu (철수): 복잡한 장시간 작업
- suji (수지): UI/UX 프론트엔드
- heukgom (흑곰): API/DB 백엔드
- hooni (훈이): DevOps 인프라
- shinhyungman (신형만): 전략 조언
- yuri (유리): 계획 수립
- bongmisun (봉미선): 사전 분석
- actiongamen (액션가면): 코드 검증
- heendungi (흰둥이): 코드 탐색
- chaesunga (채성아): 문서 검색
- namiri (나미리): 이미지/PDF 분석`,
    parameters: [
      {
        name: "agent",
        type: "string",
        description: "위임할 에이전트 이름 (예: maenggu, heendungi)",
        required: true
      },
      {
        name: "task",
        type: "string",
        description: "수행할 작업 설명",
        required: true
      },
      {
        name: "context",
        type: "string",
        description: "추가 컨텍스트 정보",
        required: false
      },
      {
        name: "run_in_background",
        type: "boolean",
        description: "배경에서 실행할지 여부",
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
          error: `에이전트 '${agentName}'을 찾을 수 없습니다.`
        };
      }
      if (runInBackground) {
        const maxConcurrent = context.settings.maxConcurrentAgents;
        const runningTasks = context.sessionState.backgroundTasks.filter((t) => t.status === "running");
        if (runningTasks.length >= maxConcurrent) {
          return {
            success: false,
            error: `최대 동시 실행 수(${maxConcurrent})에 도달했습니다.`
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
    description: "특정 Team-Seokan 에이전트를 직접 호출합니다.",
    parameters: [
      {
        name: "agent",
        type: "string",
        description: "호출할 에이전트 이름",
        required: true
      },
      {
        name: "message",
        type: "string",
        description: "에이전트에게 전달할 메시지",
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
          error: `에이전트 '${agentName}'을 찾을 수 없습니다.`
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
    description: "배경에서 에이전트 작업을 실행합니다. 메인 작업을 차단하지 않습니다.",
    parameters: [
      {
        name: "agent",
        type: "string",
        description: "실행할 에이전트 이름",
        required: true
      },
      {
        name: "task",
        type: "string",
        description: "수행할 작업",
        required: true
      },
      {
        name: "description",
        type: "string",
        description: "작업 설명 (추적용)",
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
          error: `에이전트 '${agentName}'을 찾을 수 없습니다.`
        };
      }
      const maxConcurrent = context.settings.maxConcurrentAgents;
      if (!canStartNewBackgroundTask(context.sessionState, maxConcurrent)) {
        return {
          success: false,
          error: `최대 동시 실행 수(${maxConcurrent})에 도달했습니다. 기존 작업이 완료될 때까지 기다려주세요.`
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
    description: "파일이나 이미지를 조회합니다. 나미리(Multimodal) 에이전트가 분석할 수 있습니다.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "조회할 파일 경로",
        required: true
      },
      {
        name: "analyze",
        type: "boolean",
        description: "이미지인 경우 나미리에게 분석 요청",
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
            recommendation: "나미리(Multimodal) 에이전트에게 분석을 위임하세요.",
            instruction: `delegate_task(agent="namiri", task="이 ${isImage ? "이미지" : "PDF"}를 분석해주세요: ${path2}")`
          }
        };
      }
      return {
        success: true,
        output: {
          path: path2,
          type: isImage ? "image" : isPdf ? "pdf" : "file",
          instruction: `Read 도구를 사용하여 파일을 읽으세요.`
        }
      };
    }
  };
}

// src/tools/skill/index.ts
function createSkillTool(context) {
  return {
    name: "skill",
    description: `Team-Seokan 스킬을 실행합니다.

사용 가능한 스킬:
- ultrawork: 병렬 실행 모드
- ralph: 완료까지 반복 실행
- autopilot: 자율 실행 모드
- plan: 계획 세션 시작
- analyze: 분석 모드
- deepsearch: 심층 검색
- git-master: Git 전문 모드
- frontend-ui-ux: UI/UX 전문 모드
- help: 도움말
- cancel: 현재 모드 취소`,
    parameters: [
      {
        name: "name",
        type: "string",
        description: "실행할 스킬 이름",
        required: true
      },
      {
        name: "args",
        type: "string",
        description: "스킬에 전달할 인자",
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
          error: `스킬 '${skillName}'을 찾을 수 없습니다.`
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
    description: "Team-Seokan 슬래시 명령을 실행합니다.",
    parameters: [
      {
        name: "command",
        type: "string",
        description: "실행할 명령 (예: team-seokan:help)",
        required: true
      },
      {
        name: "args",
        type: "string",
        description: "명령 인자",
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
        error: `명령 '${command}'을 찾을 수 없습니다.`
      };
    }
  };
}

// src/tools/interactive-bash/index.ts
function createInteractiveBashTool(context) {
  return {
    name: "interactive_bash",
    description: "대화형 bash 세션을 시작합니다. 사용자 입력이 필요한 명령에 사용합니다.",
    parameters: [
      {
        name: "command",
        type: "string",
        description: "실행할 명령",
        required: true
      },
      {
        name: "timeout",
        type: "number",
        description: "타임아웃 (밀리초)",
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
          note: "대화형 bash 세션은 tmux를 통해 관리됩니다.",
          instruction: `Bash 도구를 사용하세요: Bash(command="${command}", timeout=${timeout})`
        }
      };
    }
  };
}

// src/tools/ast-grep/index.ts
function createAstGrepTool(context) {
  return {
    name: "ast_grep",
    description: "AST(Abstract Syntax Tree) 기반으로 코드 패턴을 검색합니다. 정확한 코드 구조 매칭에 유용합니다.",
    parameters: [
      {
        name: "pattern",
        type: "string",
        description: "검색할 AST 패턴",
        required: true
      },
      {
        name: "language",
        type: "string",
        description: "대상 언어 (typescript, javascript, python 등)",
        required: true
      },
      {
        name: "path",
        type: "string",
        description: "검색할 경로",
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
          instruction: `ast-grep CLI를 사용하세요: sg --pattern "${pattern}" --lang ${language} ${path2}`
        }
      };
    }
  };
}

// src/tools/lsp/index.ts
function createLspDiagnosticsTool(context) {
  return {
    name: "lsp_diagnostics",
    description: "LSP를 사용하여 파일 또는 디렉토리의 타입 에러와 린트 오류를 확인합니다.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "진단할 파일 또는 디렉토리 경로",
        required: true
      }
    ],
    handler: async (params) => {
      const path2 = params.path;
      return {
        success: true,
        output: {
          path: path2,
          note: "TypeScript 프로젝트의 경우 tsc --noEmit을 사용합니다.",
          instruction: `Bash(command="npx tsc --noEmit", description="TypeScript 타입 체크")`
        }
      };
    }
  };
}
function createLspRenameTool(context) {
  return {
    name: "lsp_rename",
    description: "LSP를 사용하여 심볼 이름을 프로젝트 전체에서 안전하게 변경합니다.",
    parameters: [
      {
        name: "file",
        type: "string",
        description: "심볼이 정의된 파일",
        required: true
      },
      {
        name: "line",
        type: "number",
        description: "심볼의 라인 번호",
        required: true
      },
      {
        name: "column",
        type: "number",
        description: "심볼의 컬럼 번호",
        required: true
      },
      {
        name: "newName",
        type: "string",
        description: "새 이름",
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
          note: "IDE의 리팩토링 기능 또는 ts-morph를 사용하여 안전하게 이름을 변경하세요."
        }
      };
    }
  };
}
function createLspReferencesTool(context) {
  return {
    name: "lsp_references",
    description: "LSP를 사용하여 심볼의 모든 참조를 찾습니다.",
    parameters: [
      {
        name: "file",
        type: "string",
        description: "심볼이 정의된 파일",
        required: true
      },
      {
        name: "line",
        type: "number",
        description: "심볼의 라인 번호",
        required: true
      },
      {
        name: "column",
        type: "number",
        description: "심볼의 컬럼 번호",
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
          instruction: `Grep 도구로 심볼 이름을 검색하거나, 흰둥이(Explorer)에게 위임하세요.`
        }
      };
    }
  };
}

// src/tools/session-manager/index.ts
function createSessionManagerTool(context) {
  return {
    name: "session_manager",
    description: "Team-Seokan 세션 상태를 조회하고 관리합니다.",
    parameters: [
      {
        name: "action",
        type: "string",
        description: "수행할 액션: status, list_tasks, cancel_task",
        required: true
      },
      {
        name: "task_id",
        type: "string",
        description: "작업 ID (cancel_task 시 필요)",
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
              error: "task_id가 필요합니다."
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
            error: `알 수 없는 액션: ${action}`
          };
      }
    }
  };
}

// src/tools/memory-ops/index.ts
function createMemoryOpsTool(context) {
  return {
    name: "memory_ops",
    description: "메모리를 읽고, 쓰고, 검색합니다. (read: 읽기, write: 쓰기, search: 검색, reinforce: 강화, contradict: 반박)",
    parameters: [
      {
        name: "operation",
        type: "string",
        description: "수행할 작업: read, write, search, reinforce, contradict",
        required: true
      },
      {
        name: "memoryId",
        type: "string",
        description: "(read/reinforce/contradict) 메모리 ID",
        required: false
      },
      {
        name: "content",
        type: "string",
        description: "(write) 저장할 내용",
        required: false
      },
      {
        name: "category",
        type: "string",
        description: "(write) 메모리 카테고리: preference, pattern, context, mistake, decision, convention, insight",
        required: false
      },
      {
        name: "scope",
        type: "string",
        description: "(write) 메모리 범위: global, project (기본: project)",
        required: false,
        default: "project"
      },
      {
        name: "tags",
        type: "array",
        description: "(write) 태그 목록",
        required: false
      },
      {
        name: "keyword",
        type: "string",
        description: "(search) 검색 키워드",
        required: false
      },
      {
        name: "limit",
        type: "number",
        description: "(search) 최대 결과 수 (기본: 5)",
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
            return { success: false, error: "memoryId가 필요합니다." };
          }
          const memory = await manager.read(memoryId);
          if (!memory) {
            return { success: false, error: `ID ${memoryId}의 메모리를 찾을 수 없습니다.` };
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
            return { success: false, error: "content가 필요합니다." };
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
              message: "메모리가 저장되었습니다."
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
            return { success: false, error: "memoryId가 필요합니다." };
          }
          const reinforced = await manager.reinforce(memoryId);
          if (!reinforced) {
            return { success: false, error: `ID ${memoryId}의 메모리를 찾을 수 없습니다.` };
          }
          return {
            success: true,
            output: JSON.stringify({
              id: reinforced.id,
              title: reinforced.title,
              newConfidence: reinforced.confidence,
              reinforcementCount: reinforced.reinforcementCount,
              message: "메모리가 강화되었습니다."
            })
          };
        }
        case "contradict": {
          const memoryId = params.memoryId;
          if (!memoryId) {
            return { success: false, error: "memoryId가 필요합니다." };
          }
          const contradicted = await manager.contradict(memoryId);
          if (!contradicted) {
            return { success: false, error: `ID ${memoryId}의 메모리를 찾을 수 없습니다.` };
          }
          return {
            success: true,
            output: JSON.stringify({
              id: contradicted.id,
              title: contradicted.title,
              newConfidence: contradicted.confidence,
              contradictionCount: contradicted.contradictionCount,
              message: "메모리가 반박 처리되었습니다."
            })
          };
        }
        default:
          return {
            success: false,
            error: `알 수 없는 operation: ${operation}`
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
    description: "병렬 실행 모드를 활성화하여 여러 에이전트를 동시에 실행합니다.",
    triggers: ["ulw", "ultrawork", "병렬", "빠르게", "parallel"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      activateUltrawork(sessionState);
      return {
        success: true,
        output: `\uD83D\uDE80 **Ultrawork 모드 활성화**

병렬 실행 모드가 활성화되었습니다.

## 활성화된 기능
- 여러 에이전트 동시 실행
- 배경 작업 자동 활용
- 독립적인 작업 병렬 처리

## 사용 방법
독립적인 작업들은 자동으로 병렬 실행됩니다.
순차적 의존성이 있는 작업은 순서대로 실행됩니다.

최대 동시 실행: ${context.settings.maxConcurrentAgents}개

Ultrawork를 비활성화하려면 \`/cancel-ultrawork\`를 사용하세요.`,
        inject: `<ultrawork-mode>
Ultrawork 모드가 활성화되었습니다.
병렬 실행 가능한 작업은 동시에 처리하세요.
최대 동시 에이전트: ${context.settings.maxConcurrentAgents}개
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
    description: "작업이 완료될 때까지 반복 실행합니다.",
    triggers: ["ralph", "끝까지", "완료할 때까지", "dont stop", "don't stop"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      activateRalphLoop(sessionState);
      return {
        success: true,
        output: `\uD83D\uDD04 **Ralph 모드 활성화**

작업 완료까지 반복 실행 모드가 활성화되었습니다.

## 동작 방식
- 모든 TODO가 완료될 때까지 자동 계속
- 중단 시도 시 미완료 작업 알림
- 최대 재시도: ${context.settings.maxRetries}회

## 현재 작업
${args || "작업 내용을 입력하세요"}

Ralph를 중단하려면 \`/cancel-ralph\`를 사용하세요.`,
        inject: `<ralph-mode>
Ralph 모드가 활성화되었습니다.
모든 TODO가 완료될 때까지 작업을 계속하세요.
미완료 작업이 있으면 자동으로 재시작됩니다.
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
    description: "자율 실행 모드 - Ralph + Ultrawork 결합",
    triggers: ["autopilot", "자동으로", "알아서", "auto"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      activateAutopilot(sessionState);
      activateRalphLoop(sessionState);
      activateUltrawork(sessionState);
      return {
        success: true,
        output: `\uD83E\uDD16 **Autopilot 모드 활성화**

완전 자율 실행 모드가 활성화되었습니다.

## 활성화된 기능
- ✅ Ralph: 작업 완료까지 반복
- ✅ Ultrawork: 병렬 실행
- ✅ 자동 에이전트 위임
- ✅ 자동 검증 요청

## 작업 내용
${args || "작업 내용을 입력하세요"}

## 동작 방식
1. 요구사항 분석 (봉미선)
2. 계획 수립 (유리)
3. 구현 (맹구/전문가)
4. 검증 (액션가면)
5. 완료까지 반복

Autopilot을 중단하려면 \`/cancel-autopilot\`를 사용하세요.`,
        inject: `<autopilot-mode>
Autopilot 모드가 활성화되었습니다.
자율적으로 작업을 완료하세요.
Ralph + Ultrawork가 함께 활성화되었습니다.
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
    description: "계획 세션을 시작하여 요구사항을 정리합니다.",
    triggers: ["plan", "계획", "설계", "planning"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "plan";
      return {
        success: true,
        output: `\uD83D\uDCCB **계획 세션 시작**

유리(Planner)와 함께 계획을 수립합니다.

## 프로젝트/작업
${args || "계획할 내용을 설명해주세요"}

## 진행 방식
1. **요구사항 수집**: 목표, 제약조건, 우선순위 파악
2. **분석**: 봉미선(Metis)이 숨은 요구사항 분석
3. **계획 작성**: 단계별 작업 분해
4. **검토**: 액션가면(Reviewer) 검토

## 질문
계획을 수립하기 위해 몇 가지 질문을 드리겠습니다.

유리(Planner)에게 위임합니다...`,
        inject: `<plan-mode>
계획 세션이 시작되었습니다.
유리(Planner)에게 위임하여 체계적인 계획을 수립하세요.
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
    description: "심층 분석 모드를 활성화합니다.",
    triggers: ["analyze", "분석", "디버깅", "왜 안", "debug", "investigate"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "analyze";
      return {
        success: true,
        output: `\uD83D\uDD0D **분석 모드 활성화**

신형만(Oracle)과 함께 심층 분석을 수행합니다.

## 분석 대상
${args || "분석할 내용을 설명해주세요"}

## 분석 접근법
1. **현상 파악**: 문제 상황 정확히 이해
2. **원인 추적**: 근본 원인 식별
3. **영향 분석**: 관련 코드/기능 파악
4. **해결 방안**: 옵션 및 추천 제시

신형만(Oracle)에게 위임합니다...`,
        inject: `<analyze-mode>
분석 모드가 활성화되었습니다.
신형만(Oracle)에게 위임하여 심층 분석을 수행하세요.
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
    description: "코드베이스를 깊이 탐색합니다.",
    triggers: ["deepsearch", "깊은검색", "찾아줘", "search"],
    autoActivate: true,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "deepsearch";
      return {
        success: true,
        output: `\uD83D\uDD0E **Deepsearch 모드 활성화**

흰둥이(Explorer)와 채성아(Librarian)가 함께 심층 검색을 수행합니다.

## 검색 대상
${args || "검색할 내용을 설명해주세요"}

## 검색 전략
1. **코드 탐색**: 흰둥이가 코드베이스 탐색
2. **문서 검색**: 채성아가 문서/외부 정보 검색
3. **결과 종합**: 발견한 정보 정리

병렬로 검색을 시작합니다...`,
        inject: `<deepsearch-mode>
Deepsearch 모드가 활성화되었습니다.
흰둥이(Explorer)와 채성아(Librarian)에게 병렬로 위임하세요.
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
    description: "Git 작업 전문 모드를 활성화합니다.",
    triggers: ["commit", "push", "merge", "rebase", "git"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "git-master";
      return {
        success: true,
        output: `\uD83C\uDF3F **Git-Master 모드 활성화**

Git 작업 전문 모드입니다.

## Git 가이드라인
- 원자적 커밋 (하나의 목적, 하나의 커밋)
- 명확한 커밋 메시지
- 브랜치 전략 준수

## 커밋 메시지 형식
\`\`\`
<type>: <subject>

<body>

Co-Authored-By: Team-Seokan <noreply@team-seokan.dev>
\`\`\`

## 타입
- feat: 새 기능
- fix: 버그 수정
- refactor: 리팩토링
- docs: 문서
- test: 테스트
- chore: 기타`
      };
    }
  };
}

// src/features/builtin-skills/frontend-ui-ux/index.ts
function createFrontendUiUxSkill(context) {
  return {
    name: "frontend-ui-ux",
    displayName: "Frontend-UI-UX",
    description: "UI/UX 작업 전문 모드를 활성화합니다.",
    triggers: ["UI", "UX", "컴포넌트", "스타일", "CSS", "component"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      sessionState.activeSkill = "frontend-ui-ux";
      return {
        success: true,
        output: `\uD83C\uDFA8 **Frontend-UI-UX 모드 활성화**

수지(Frontend)와 함께 UI/UX 작업을 수행합니다.

## UI/UX 원칙
- 사용자 중심 설계
- 접근성 (a11y) 고려
- 반응형 디자인
- 일관된 디자인 시스템

## 작업 내용
${args || "UI/UX 작업 내용을 설명해주세요"}

수지(Frontend)에게 위임합니다...`,
        inject: `<frontend-ui-ux-mode>
Frontend-UI-UX 모드가 활성화되었습니다.
수지(Frontend)에게 위임하여 UI/UX 작업을 수행하세요.
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
    description: "Team-Seokan 사용법을 안내합니다.",
    triggers: ["help", "도움말", "사용법"],
    autoActivate: false,
    handler: async () => {
      return {
        success: true,
        output: `# \uD83C\uDFAD Team-Seokan 도움말

## 에이전트 팀 (14명)

### 오케스트레이션
- **짱구**: 메인 오케스트레이터
- **짱아**: 대규모 프로젝트 조율

### 실행
- **맹구**: 코드 작성/수정
- **철수**: 복잡한 장시간 작업

### 전문가
- **수지**: UI/UX 프론트엔드
- **흑곰**: API/DB 백엔드
- **훈이**: DevOps 인프라

### 조언 (읽기 전용)
- **신형만**: 전략 조언/디버깅
- **유리**: 계획 수립
- **봉미선**: 사전 분석
- **액션가면**: 검증/리뷰

### 탐색 (읽기 전용)
- **흰둥이**: 코드 탐색
- **채성아**: 문서 검색
- **나미리**: 이미지/PDF 분석

## 스킬

| 스킬 | 트리거 | 설명 |
|------|--------|------|
| ultrawork | ulw, 병렬 | 병렬 실행 모드 |
| ralph | 끝까지 | 완료까지 반복 |
| autopilot | 자동으로 | 자율 실행 |
| plan | 계획 | 계획 세션 |
| analyze | 분석 | 심층 분석 |
| deepsearch | 찾아줘 | 심층 검색 |

## 사용 예시

\`\`\`
# 에이전트 위임
delegate_task(agent="maenggu", task="버튼 컴포넌트 추가")

# 스킬 실행
/team-seokan:ultrawork 빠르게 처리해줘

# 배경 실행
background_task(agent="heendungi", task="API 엔드포인트 찾기")
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
    description: "활성화된 모드를 취소합니다.",
    triggers: ["cancel", "취소", "중단", "stop", "멈춰"],
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
          cancelled.push("Autopilot (Ralph + Ultrawork 포함)");
        }
      }
      sessionState.activeSkill = undefined;
      if (cancelled.length === 0) {
        return {
          success: true,
          output: `ℹ️ 취소할 활성 모드가 없습니다.`
        };
      }
      return {
        success: true,
        output: `⏹️ **모드 취소됨**

다음 모드가 취소되었습니다:
${cancelled.map((c) => `- ${c}`).join(`
`)}

일반 모드로 돌아갑니다.`
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
- **카테고리**: ${memory.category}
- **신뢰도**: ${confidenceStr} (${(confidence * 100).toFixed(0)}%)
- **생성일**: ${date}
- **태그**: ${tags || "없음"}

> ${memory.content}
`;
}
function formatCategorySummary(stats, avgConfidence) {
  const lines = [];
  for (const [category, count] of stats) {
    lines.push(`- ${category}: ${count}개`);
  }
  return `## \uD83D\uDCCA 메모리 통계

**총 메모리 수**: ${Array.from(stats.values()).reduce((a, b) => a + b, 0)}개
**평균 신뢰도**: ${(avgConfidence * 100).toFixed(1)}%

### 카테고리별
${lines.join(`
`)}
`;
}
function createMemoriesSkill(context) {
  return {
    name: "memories",
    displayName: "Memories",
    description: "학습된 메모리를 조회합니다.",
    triggers: ["memories", "기억", "학습 내용", "what did you learn"],
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
        if (lowerArgs.includes("stats") || lowerArgs.includes("통계")) {
          showStats = true;
        }
        const limitMatch = lowerArgs.match(/(\d+)개?/);
        if (limitMatch) {
          limit = parseInt(limitMatch[1], 10);
        }
        if (showStats) {
          const stats = await manager.getStats();
          return {
            success: true,
            output: `# \uD83E\uDDE0 Team-Seokan 메모리 통계

${formatCategorySummary(stats.byCategory, stats.averageConfidence)}

### 에이전트별
${Array.from(stats.byOwner.entries()).map(([owner, count]) => `- ${owner}: ${count}개`).join(`
`)}

### 인기 태그
${stats.topTags.slice(0, 5).map(([tag, count]) => `- #${tag}: ${count}회`).join(`
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
            output: `# \uD83E\uDDE0 학습된 메모리

아직 학습된 메모리가 없습니다.

작업을 수행하면서 자동으로 학습하거나, \`/learn "내용"\`으로 직접 가르칠 수 있습니다.`
          };
        }
        const memoryList = result.memories.map((m, i) => formatMemory(m, i)).join(`
---

`);
        return {
          success: true,
          output: `# \uD83E\uDDE0 학습된 메모리 (${result.total}개 중 ${result.memories.length}개)

${category ? `**필터**: ${category}` : ""}

${memoryList}

---
\uD83D\uDCA1 더 보려면: \`/memories 20개\`
\uD83D\uDCA1 카테고리별: \`/memories preference\`
\uD83D\uDCA1 통계 보기: \`/memories stats\`
`
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ 메모리 조회 실패: ${error}`
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
    description: "특정 메모리를 삭제합니다.",
    triggers: ["forget", "잊어", "삭제", "delete memory"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      if (!args || args.trim() === "") {
        return {
          success: false,
          output: `# ❌ 삭제 대상 필요

\`/forget "키워드"\` 형식으로 삭제할 메모리를 지정해주세요.

**사용법:**
- \`/forget 네이밍\` - "네이밍" 관련 메모리 삭제
- \`/forget preference\` - 모든 선호도 메모리 삭제
- \`/forget all\` - 모든 메모리 삭제 (주의!)

\uD83D\uDCA1 먼저 \`/memories\`로 현재 학습 내용을 확인하세요.`
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
            output: `# \uD83D\uDDD1️ 전체 메모리 삭제

**${totalBefore}개**의 메모리가 모두 삭제되었습니다.

학습이 초기화되었습니다. 새로운 작업부터 다시 학습을 시작합니다.`
          };
        }
        const deletedCount = await manager.forget(keyword);
        if (deletedCount === 0) {
          return {
            success: true,
            output: `# ℹ️ 삭제 대상 없음

"${keyword}"와 관련된 메모리를 찾을 수 없습니다.

\uD83D\uDCA1 \`/memories\`로 현재 학습 내용을 확인하세요.`
          };
        }
        return {
          success: true,
          output: `# \uD83D\uDDD1️ 메모리 삭제 완료

**${deletedCount}개**의 "${keyword}" 관련 메모리가 삭제되었습니다.

이 내용은 더 이상 에이전트의 행동에 영향을 주지 않습니다.`
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ 메모리 삭제 실패: ${error}`
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
    description: "명시적으로 새로운 내용을 학습합니다.",
    triggers: ["learn", "배워", "기억해", "remember this"],
    autoActivate: false,
    handler: async ({ args, sessionState }) => {
      if (!args || args.trim() === "") {
        return {
          success: false,
          output: `# ❌ 학습 내용 필요

\`/learn "내용"\` 형식으로 학습할 내용을 입력해주세요.

**사용법:**
\`\`\`
/learn 나는 컴포넌트에 항상 .component.tsx 확장자를 사용해

/learn API 에러는 항상 한국어로 표시해줘 #preference #api

/learn --category=convention 변수명은 camelCase로 작성

/learn --project --category=context 이 프로젝트는 Next.js 14 사용
\`\`\`

**옵션:**
- \`#tag\` - 태그 추가
- \`--category=xxx\` - 카테고리 지정 (preference, pattern, convention, etc.)
- \`--global\` - 모든 프로젝트에 적용
- \`--project\` - 현재 프로젝트에만 적용 (기본값)`
        };
      }
      try {
        const manager = getMemoryManager();
        await manager.initialize();
        const { content, category, scope, tags } = parseLearnArgs(args);
        if (!content) {
          return {
            success: false,
            output: "❌ 학습할 내용이 비어있습니다."
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
          output: `# ✅ 학습 완료!

**제목**: ${memory.title}
**카테고리**: ${memory.category}
**스코프**: ${memory.scope === "global" ? "글로벌 (모든 프로젝트)" : "프로젝트 전용"}
**태그**: ${memory.tags.length > 0 ? memory.tags.map((t) => `#${t}`).join(" ") : "없음"}

> ${memory.content}

---
이 내용은 앞으로 에이전트의 행동에 반영됩니다.

\uD83D\uDCA1 학습 내용 확인: \`/memories\`
\uD83D\uDCA1 학습 삭제: \`/forget "${memory.title.slice(0, 10)}..."\``
        };
      } catch (error) {
        return {
          success: false,
          output: `❌ 학습 실패: ${error}`
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
  if (/ui|ux|프론트|frontend|컴포넌트|component|react|css|스타일/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.frontend;
  }
  if (/api|백엔드|backend|db|database|서버|server|graphql|rest/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.backend;
  }
  if (/배포|deploy|인프라|infra|devops|ci|cd|docker|k8s/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.devops;
  }
  if (/아키텍처|architecture|설계|design|구조|시스템/.test(lowerTopic)) {
    return DEBATE_PARTICIPANTS.architecture;
  }
  if (/전체|풀스택|fullstack|통합/.test(lowerTopic)) {
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
    triggers: ["debate", "토론", "의견", "논의", "장단점", "비교"],
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

**Midori가 Debate를 진행합니다.**`,
        inject: `<debate-mode>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 EXECUTE IMMEDIATELY: Debate Process
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 1: Call Midori to Conduct Debate

You MUST immediately delegate this debate to Midori using the Task tool.

Task(
  subagent_type="team-shinchan:midori",
  model="opus",
  prompt="Debate를 진행해주세요.

## 주제
${topic}

## 패널
${participants.map(p => `- ${AGENT_DISPLAY_NAMES2[p]} (${AGENT_ROLES2[p]})`).join('\n')}

## 진행 방식
1. Debate 시작 공지 출력
2. 각 패널로부터 의견 수집 (병렬 Task 호출)
3. 각 의견 실시간 출력
4. Hiroshi에게 합의 도출 요청
5. 최종 결정 사항 출력

## 출력 형식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate 진행 중
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주제: {주제}
👥 패널: {패널 목록}

🎤 Round 1: 의견 수집
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[각 에이전트 의견]

✅ 권장 결정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 결정: {결정}
📝 근거: {근거}

IMPORTANT: 즉시 Debate를 실행하고 결과를 Shinnosuke에게 반환하세요."
)

## Step 2: Relay Results to User

After receiving Midori's result, you MUST present it to the user in this format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💭 Debate 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 주제: ${topic}

🎤 전문가 의견:
[Summarize each panelist's opinion concisely]
${participants.map(p => `- [${AGENT_DISPLAY_NAMES2[p]}]: {의견 요약}`).join('\n')}

✅ 권장 결정: {Midori가 제시한 결론}
📝 근거: {결정 근거}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Step 3: Ask for User's Decision

After presenting the results, ask the user:

"위 권장 결정에 동의하시나요? 다른 의견이나 추가로 고려할 사항이 있으시면 말씀해주세요."

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
  console.log(`[Team-Seokan] 플러그인 초기화 완료`);
  console.log(`[Team-Seokan] 에이전트: ${pluginContext.agents.size}개`);
  console.log(`[Team-Seokan] 훅: ${pluginContext.hooks.size}개`);
  console.log(`[Team-Seokan] 도구: ${pluginContext.tools.size}개`);
  console.log(`[Team-Seokan] 스킬: ${pluginContext.skills.size}개`);
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
        console.log("[Team-Seokan] 새 세션 시작");
      },
      "session.deleted": async (event) => {
        console.log("[Team-Seokan] 세션 종료");
      },
      "chat.message": async (message) => {
        pluginContext.sessionState.messageCount++;
        if (pluginContext.sessionState.messageCount >= settings.contextWarningThreshold) {
          console.log("[Team-Seokan] ⚠️ 컨텍스트 사용량 경고");
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
        console.error("[Team-Seokan] 에러:", error);
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
