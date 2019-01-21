'use strict';

var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

function createBaseAST() {
  var ast = {};
  ast.type = 'Program';
  ast.body = [];
  return ast;
}

function createStubFunctionASTNode(functionName, leadingComments, params) {
  var node = {
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

function _generateStubs(data, options) {
  var ast = esprima.parseScript(data, { attachComment: options.comment });
  var stubs = [];
  var functionName;
  estraverse.traverse(ast, {
    leave: function (node) {
      if (node.type === 'ExpressionStatement'
        && isGlobalAssignmentExpression(node.expression)) {
        functionName = node.expression.left.property.name;
        stubs.push(createStubFunctionASTNode(functionName, node.leadingComments, node.expression.right.params));
      } else if (node.type === 'ExpressionStatement' 
        && node.expression.type === 'SequenceExpression') {
        node.expression.expressions.forEach(function (expression) {
          if (isGlobalAssignmentExpression(expression)) {
            functionName = expression.left.property.name;
            stubs.push(createStubFunctionASTNode(functionName, node.leadingComments, expression.right.params));
          }
        });
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

function generateStubs(source, options) {
  options = options || {comment: false};
  var comment = !!options.comment;
  var baseAST = createBaseAST();
  var stubs = _generateStubs(source, options);
  stubs.forEach(function (stub) {
    baseAST.body.push(stub);
  });
  return escodegen.generate(baseAST, { comment: comment });
}

module.exports = generateStubs;
