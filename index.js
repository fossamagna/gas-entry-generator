'use strict';

const esprima = require('esprima');
const estraverse = require('estraverse');
const escodegen = require('escodegen');

function createBaseAST() {
  const ast = {};
  ast.type = 'Program';
  ast.body = [];
  return ast;
}

function createStubFunctionASTNode(functionName, leadingComments, params) {
  const node = {
    type: 'FunctionDeclaration',
    id: {
      type: 'Identifier',
      name: functionName
    },
    params: [],
    defaults: [],
    body: {
      type: 'BlockStatement',
      body: []
    },
    generator: false,
    expression: false
  };
  if (leadingComments) {
    node.leadingComments = leadingComments;
  }
  if (params) {
    node.params = params;
  }
  return node;
}

function _generateStubs(ast, options) {
  const autoGlobalExports = options.autoGlobalExports;
  const stubs = [];
  estraverse.traverse(ast, {
    leave: function (node) {
      if (node.type === 'ExpressionStatement'
        && isGlobalAssignmentExpression(node.expression)) {
        const functionName = node.expression.left.property.name;
        stubs.push(createStubFunctionASTNode(functionName, node.leadingComments, node.expression.right.params));
      } else if (node.type === 'ExpressionStatement' 
        && node.expression.type === 'SequenceExpression') {
        node.expression.expressions.forEach(function (expression) {
          if (isGlobalAssignmentExpression(expression)) {
            const functionName = expression.left.property.name;
            stubs.push(createStubFunctionASTNode(functionName, expression.leadingComments ?
              expression.leadingComments : node.leadingComments, expression.right.params));
          }
        });
      }
      if (autoGlobalExports) {
        if (node.type === 'ExpressionStatement'
          && isExportsAssignmentExpression(node.expression)) {
            const functionName = node.expression.left.property.name;
            stubs.push(createStubFunctionASTNode(functionName, node.leadingComments, node.expression.right.params));
        } else if (node.type === 'ExpressionStatement' 
          && node.expression.type === 'SequenceExpression') {
          node.expression.expressions.forEach(function (expression) {
            if (isExportsAssignmentExpression(expression)) {
              const functionName = expression.left.property.name;
              stubs.push(createStubFunctionASTNode(functionName, expression.leadingComments ?
                expression.leadingComments : node.leadingComments, expression.right.params));
            }
          });
        }
      }
    }
  });

  return stubs;
}

function isGlobalAssignmentExpression(node) {
  return node.type === 'AssignmentExpression'
    && node.operator === '='
    && node.left.type === 'MemberExpression'
    && node.left.object.type === 'Identifier'
    && node.left.object.name === 'global'
}

function isExportsAssignmentExpression(node) {
  return node.type === 'AssignmentExpression'
    && node.operator === '='
    && node.left.type === 'MemberExpression'
    && node.left.object.type === 'Identifier'
    && node.left.object.name === 'exports'
}

function generateStubs(ast, options) {
  const baseAST = createBaseAST();
  const stubs = _generateStubs(ast, options);
  stubs.forEach(function (stub) {
    baseAST.body.push(stub);
  });
  return escodegen.generate(baseAST, { comment: !!options.comment });
}

function generateGlobalAssignments(ast) {
  const stubs = [];
  estraverse.traverse(ast, {
    leave: (node) => {
      if (node.type === 'ExpressionStatement'
        && isExportsAssignmentExpression(node.expression)) {
          const functionName = node.expression.left.property.name;
          stubs.push(createGlobalAssignmentASTNode(functionName));
      } else if (node.type === 'ExpressionStatement' 
        && node.expression.type === 'SequenceExpression') {
        node.expression.expressions.forEach(function (expression) {
          if (isExportsAssignmentExpression(expression)) {
            const functionName = expression.left.property.name;
            stubs.push(createGlobalAssignmentASTNode(functionName));
          }
        });
      }
    }
  });
  const baseAST = createBaseAST();
  stubs.forEach(function (stub) {
    baseAST.body.push(stub);
  });
  return escodegen.generate(baseAST);
}

function createGlobalAssignmentASTNode(functionName) {
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
          name: "global"
        },
        property: {
          type: "Identifier",
          name: functionName
        }
      },
      right: {
        type: "MemberExpression",
        computed: false,
        object: {
          type: "Identifier",
          name: "exports"
        },
        property: {
          type: "Identifier",
          name: functionName
        }
      }
    }
  };
  return node;
}

exports.generate = function(source, options = { comment: false, autoGlobalExports: false }){
  const ast = esprima.parseScript(source, { attachComment: options.comment });
  const functions = generateStubs(ast, options);
  const globalAssignments = options.autoGlobalExports ? generateGlobalAssignments(ast, options) : undefined;
  return {
    entryPointFunctions : functions,
    globalAssignments
  };
}

