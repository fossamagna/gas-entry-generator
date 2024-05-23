"use strict";

const esprima = require("esprima-next");
const estraverse = require("estraverse");
const escodegen = require("escodegen");

function createBaseAST() {
  const ast = {};
  ast.type = "Program";
  ast.body = [];
  return ast;
}

function createStubFunctionASTNode(functionName, leadingComments, params) {
  const node = {
    type: "FunctionDeclaration",
    id: {
      type: "Identifier",
      name: functionName,
    },
    params: [],
    defaults: [],
    body: {
      type: "BlockStatement",
      body: [],
    },
    generator: false,
    expression: false,
  };
  if (leadingComments) {
    node.leadingComments = leadingComments;
  }
  if (params) {
    node.params = params;
  }
  return node;
}

class EntryPointFunctions {
  constructor() {
    this.stubs = new Map();
    this.functionNames = [];
  }

  add(functionName, params, comments) {
    let index = this.functionNames.indexOf(functionName);
    if (index === -1) {
      index = this.functionNames.push(functionName) - 1;
    }
    this.stubs.set(
      index,
      createStubFunctionASTNode(functionName, comments, params)
    );
  }

  getEntryPointFunctions() {
    const entryPointFunctions = [];
    for (let index = 0; index < this.functionNames.length; index++) {
      entryPointFunctions.push(this.stubs.get(index));
    }
    return entryPointFunctions;
  }
}

class GlobalAssignments {
  constructor({
    exportsIdentifierName = "exports",
    globalIdentifierName = "global",
  }) {
    this.stubs = [];
    this.functionNames = new Set();
    this.exportsIdentifierName = exportsIdentifierName;
    this.globalIdentifierName = globalIdentifierName;
  }

  add(functionName) {
    if (this.functionNames.has(functionName)) {
      return;
    }
    this.functionNames.add(functionName);
    this.stubs.push(
      createGlobalAssignmentASTNode(
        functionName,
        this.exportsIdentifierName,
        this.globalIdentifierName
      )
    );
  }

  getGlobalAssignments() {
    return this.stubs;
  }
}

function _generateStubs(ast, options) {
  const autoGlobalExports = options.autoGlobalExports;
  const entryPointFunctions = new EntryPointFunctions();
  estraverse.traverse(ast, {
    leave: function (node) {
      if (
        node.type === "ExpressionStatement" &&
        isGlobalAssignmentExpression(node.expression)
      ) {
        const functionName = node.expression.left.property.name;
        entryPointFunctions.add(
          functionName,
          node.expression.right.params,
          node.leadingComments
        );
      } else if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "SequenceExpression"
      ) {
        node.expression.expressions.forEach(function (expression) {
          if (isGlobalAssignmentExpression(expression)) {
            const functionName = expression.left.property.name;
            entryPointFunctions.add(
              functionName,
              expression.right.params,
              expression.leadingComments
                ? expression.leadingComments
                : node.leadingComments
            );
          }
        });
      }
      if (autoGlobalExports) {
        if (
          node.type === "ExpressionStatement" &&
          isNamedExportsAssignmentExpression(node.expression)
        ) {
          const functionName = node.expression.left.property.name;
          entryPointFunctions.add(
            functionName,
            node.expression.right.params,
            node.leadingComments
          );
        } else if (
          node.type === "ExpressionStatement" &&
          node.expression.type === "SequenceExpression"
        ) {
          node.expression.expressions.forEach(function (expression) {
            if (isNamedExportsAssignmentExpression(expression)) {
              const functionName = expression.left.property.name;
              entryPointFunctions.add(
                functionName,
                expression.right.params,
                expression.leadingComments
                  ? expression.leadingComments
                  : node.leadingComments
              );
            }
          });
        } else if (node.type === "ExportNamedDeclaration") {
          const functionNames = node.specifiers.map(
            (specifier) => specifier.local.name
          );
          functionNames.forEach((functionName) =>
            entryPointFunctions.add(functionName)
          );
          // ex: export function foo() {};
          if (
            node.declaration &&
            node.declaration.type === "FunctionDeclaration"
          ) {
            entryPointFunctions.add(node.declaration.id.name);
          }
        }
      }
    },
  });

  return entryPointFunctions.getEntryPointFunctions();
}

function isGlobalAssignmentExpression(node) {
  return (
    node.type === "AssignmentExpression" &&
    node.operator === "=" &&
    node.left.type === "MemberExpression" &&
    node.left.object.type === "Identifier" &&
    node.left.object.name === "global"
  );
}

function isNamedExportsAssignmentExpression(node) {
  return (
    node.type === "AssignmentExpression" &&
    node.operator === "=" &&
    node.left.type === "MemberExpression" &&
    node.left.object.type === "Identifier" &&
    node.left.object.name === "exports" &&
    node.left.property.type === "Identifier" &&
    node.left.property.name !== "default"
  );
}

function generateStubs(ast, options) {
  const baseAST = createBaseAST();
  const stubs = _generateStubs(ast, options);
  baseAST.body.push(...stubs);
  return escodegen.generate(baseAST, { comment: !!options.comment });
}

function generateGlobalAssignments(ast, options) {
  const globalAssignments = new GlobalAssignments(options);
  estraverse.traverse(ast, {
    leave: (node) => {
      if (
        node.type === "ExpressionStatement" &&
        isNamedExportsAssignmentExpression(node.expression)
      ) {
        const functionName = node.expression.left.property.name;
        globalAssignments.add(functionName);
      } else if (
        node.type === "ExpressionStatement" &&
        node.expression.type === "SequenceExpression"
      ) {
        node.expression.expressions.forEach(function (expression) {
          if (isNamedExportsAssignmentExpression(expression)) {
            const functionName = expression.left.property.name;
            globalAssignments.add(functionName);
          }
        });
      } else if (node.type === "ExportNamedDeclaration") {
        // ex: export { foo } from './foo.js';
        const functionNames = node.specifiers.map(
          (specifier) => specifier.local.name
        );
        functionNames.forEach((functionName) =>
          globalAssignments.add(functionName)
        );
        // ex: export function foo() {};
        if (
          node.declaration &&
          node.declaration.type === "FunctionDeclaration"
        ) {
          globalAssignments.add(node.declaration.id.name);
        }
      }
    },
  });
  const baseAST = createBaseAST();
  baseAST.body.push(...globalAssignments.getGlobalAssignments());
  return escodegen.generate(baseAST);
}

function createGlobalAssignmentASTNode(
  functionName,
  exportsIdentifierName,
  globalIdentifierName
) {
  const node = {
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      operator: "=",
      left: {
        type: "MemberExpression",
        computed: false,
        object: {
          type: "Identifier",
          name: globalIdentifierName,
        },
        property: {
          type: "Identifier",
          name: functionName,
        },
      },
      right: {
        type: "MemberExpression",
        computed: false,
        object: {
          type: "Identifier",
          name: exportsIdentifierName,
        },
        property: {
          type: "Identifier",
          name: functionName,
        },
      },
    },
  };
  return node;
}

const defaultOptions = {
  comment: false,
  autoGlobalExports: false,
  exportsIdentifierName: "exports",
  globalIdentifierName: "global",
};

exports.generate = function (source, options = defaultOptions) {
  options = Object.assign({}, defaultOptions, options);
  const ast = esprima.parseModule(source, { attachComment: options.comment });
  const functions = generateStubs(ast, options);
  const globalAssignments = options.autoGlobalExports
    ? generateGlobalAssignments(ast, options)
    : undefined;
  return {
    entryPointFunctions: functions,
    globalAssignments,
  };
};
