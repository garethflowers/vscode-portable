/*!--------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
"use strict";var __extends=this&&this.__extends||function(e,t){function r(){this.constructor=e}for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i]);e.prototype=null===t?Object.create(t):(r.prototype=t.prototype,new r)};define("vs/languages/less/common/parser/lessScanner",["require","exports","vs/languages/css/common/parser/cssScanner"],function(e,t,r){var i=("%".charCodeAt(0),"(".charCodeAt(0),"/".charCodeAt(0)),n="\n".charCodeAt(0),s="\r".charCodeAt(0),a="\f".charCodeAt(0),o="`".charCodeAt(0),l=".".charCodeAt(0),c=r.TokenType.CustomToken;t.Ellipsis=c++;var p=function(e){function c(){e.apply(this,arguments)}return __extends(c,e),c.prototype.scan=function(i){void 0===i&&(i=!0);var n={type:void 0,text:void 0,offset:this.stream.pos(),len:0};if(this.lessComment())return this.ignoreComment?this.scan(i):this.finishToken(n,r.TokenType.SingleLineComment);var s=this.escapedJavaScript();return null!==s?this.finishToken(n,s):this.stream.advanceIfChars([l,l,l])?this.finishToken(n,t.Ellipsis):e.prototype.scan.call(this,i)},c.prototype.lessComment=function(){return this.stream.advanceIfChars([i,i])?(this.stream.advanceWhileChar(function(e){switch(e){case n:case s:case a:return!1;default:return!0}}),!0):!1},c.prototype.escapedJavaScript=function(){var e=this.stream.peekChar();return e===o?(this.stream.advance(1),this.stream.advanceWhileChar(function(e){return e!==o}),this.stream.advanceIfChar(o)?r.TokenType.EscapedJavaScript:r.TokenType.BadEscapedJavaScript):null},c}(r.Scanner);t.LessScanner=p});var __extends=this&&this.__extends||function(e,t){function r(){this.constructor=e}for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i]);e.prototype=null===t?Object.create(t):(r.prototype=t.prototype,new r)};define("vs/languages/less/common/parser/lessParser",["require","exports","./lessScanner","vs/languages/css/common/parser/cssScanner","vs/languages/css/common/parser/cssParser","vs/languages/css/common/parser/cssNodes","vs/languages/css/common/parser/cssErrors"],function(e,t,r,i,n,s,a){var o=function(e){function t(){e.call(this,new r.LessScanner)}return __extends(t,e),t.prototype._parseStylesheetStatement=function(){return this._tryParseMixinDeclaration()||e.prototype._parseStylesheetStatement.call(this)||this._parseVariableDeclaration()},t.prototype._parseImport=function(){var e=this.create(s.Import);if(!this.accept(i.TokenType.AtKeyword,"@import")&&!this.accept(i.TokenType.AtKeyword,"@import-once"))return null;if(this.accept(i.TokenType.ParenthesisL)){if(!this.accept(i.TokenType.Ident))return this.finish(e,a.ParseError.IdentifierExpected,[i.TokenType.SemiColon]);if(!this.accept(i.TokenType.ParenthesisR))return this.finish(e,a.ParseError.RightParenthesisExpected,[i.TokenType.SemiColon])}return this.accept(i.TokenType.URI)||this.accept(i.TokenType.String)?(e.setMedialist(this._parseMediaList()),this.finish(e)):this.finish(e,a.ParseError.URIOrStringExpected,[i.TokenType.SemiColon])},t.prototype._parseMediaQuery=function(t){var r=e.prototype._parseMediaQuery.call(this,t);if(!r){var r=this.create(s.MediaQuery);return r.addChild(this._parseVariable())?this.finish(r):null}return r},t.prototype._parseVariableDeclaration=function(e){void 0===e&&(e=[]);var t=this.create(s.VariableDeclaration),r=this.mark();return t.setVariable(this._parseVariable())?this.accept(i.TokenType.Colon,":")?(t.colonPosition=this.prevToken.offset,t.setValue(this._parseExpr())?this.finish(t):this.finish(t,a.ParseError.VariableValueExpected,[],e)):(this.restoreAtMark(r),null):null},t.prototype._parseVariable=function(){for(var e=this.create(s.Variable),t=this.mark();this.accept(i.TokenType.Delim,"@");)if(this.hasWhitespace())return this.restoreAtMark(t),null;return this.accept(i.TokenType.AtKeyword)?e:(this.restoreAtMark(t),null)},t.prototype._parseTerm=function(){var t=e.prototype._parseTerm.call(this);return t?t:(t=this.create(s.Term),t.setExpression(this._parseVariable())||t.setExpression(this._parseEscaped())?this.finish(t):null)},t.prototype._parseEscaped=function(){var e=this.createNode(s.NodeType.EscapedValue);return this.accept(i.TokenType.EscapedJavaScript)||this.accept(i.TokenType.BadEscapedJavaScript)?this.finish(e):this.accept(i.TokenType.Delim,"~")?this.finish(e,this.accept(i.TokenType.String)?null:a.ParseError.TermExpected):null},t.prototype._parseOperator=function(){var t=this._parseGuardOperator();return t?t:e.prototype._parseOperator.call(this)},t.prototype._parseGuardOperator=function(){var e=this.createNode(s.NodeType.Operator);return this.accept(i.TokenType.Delim,">")?(this.accept(i.TokenType.Delim,"="),e):this.accept(i.TokenType.Delim,"=")?(this.accept(i.TokenType.Delim,"<"),e):this.accept(i.TokenType.Delim,"<")?e:null},t.prototype._parseRuleSetDeclaration=function(){return this.peek(i.TokenType.AtKeyword)?this._parseKeyframe()||this._parseMedia()||this._parseVariableDeclaration():this._tryParseMixinDeclaration()||this._tryParseRuleset(!0)||this._parseMixinReference()||this._parseExtend()||this._parseDeclaration()},t.prototype._parseSimpleSelectorBody=function(){return this._parseSelectorCombinator()||e.prototype._parseSimpleSelectorBody.call(this)},t.prototype._parseSelectorCombinator=function(){var e=this.createNode(s.NodeType.SelectorCombinator);if(this.accept(i.TokenType.Delim,"&")){for(;!this.hasWhitespace()&&(this.accept(i.TokenType.Delim,"-")||e.addChild(this._parseIdent())||this.accept(i.TokenType.Delim,"&")););return this.finish(e)}return null},t.prototype._parseSelectorIdent=function(){return this._parseIdent()||this._parseSelectorInterpolation()},t.prototype._parseSelectorInterpolation=function(){var e=this.createNode(s.NodeType.SelectorInterpolation);return this.accept(i.TokenType.Delim,"~")?this.hasWhitespace()||!this.accept(i.TokenType.String)&&!this.accept(i.TokenType.BadString)?this.finish(e,a.ParseError.StringLiteralExpected):this.finish(e):this.accept(i.TokenType.Delim,"@")?this.hasWhitespace()||!this.accept(i.TokenType.CurlyL)?this.finish(e,a.ParseError.LeftCurlyExpected):e.addChild(this._parseIdent())?this.accept(i.TokenType.CurlyR)?this.finish(e):this.finish(e,a.ParseError.RightCurlyExpected):this.finish(e,a.ParseError.IdentifierExpected):null},t.prototype._tryParseMixinDeclaration=function(){if(!this.peek(i.TokenType.Delim,"."))return null;var e=this.mark(),t=this.create(s.MixinDeclaration);if(!t.setIdentifier(this._parseMixinDeclarationIdentifier())||!this.accept(i.TokenType.ParenthesisL))return this.restoreAtMark(e),null;if(t.getParameters().addChild(this._parseMixinParameter()))for(;this.accept(i.TokenType.Comma)||this.accept(i.TokenType.SemiColon);)if(!t.getParameters().addChild(this._parseMixinParameter()))return this.finish(t,a.ParseError.IdentifierExpected);return this.accept(i.TokenType.ParenthesisR)?(t.setGuard(this._parseGuard()),this.peek(i.TokenType.CurlyL)?this._parseBody(t,this._parseRuleSetDeclaration.bind(this)):(this.restoreAtMark(e),null)):this.finish(t,a.ParseError.RightParenthesisExpected)},t.prototype._parseMixinDeclarationIdentifier=function(){var e=this.create(s.Identifier);return this.consumeToken(),this.hasWhitespace()||!this.accept(i.TokenType.Ident)?null:(e.referenceTypes=[s.ReferenceType.Mixin],this.finish(e))},t.prototype._parseExtend=function(){if(!this.peek(i.TokenType.Delim,"&"))return null;var e=this.mark(),t=this.create(s.ExtendsReference);return this.consumeToken(),!this.hasWhitespace()&&this.accept(i.TokenType.Colon)&&this.accept(i.TokenType.Ident,"extend")?this.accept(i.TokenType.ParenthesisL)?t.setSelector(this._parseSimpleSelector())?this.accept(i.TokenType.ParenthesisR)?this.finish(t):this.finish(t,a.ParseError.RightParenthesisExpected):this.finish(t,a.ParseError.SelectorExpected):this.finish(t,a.ParseError.LeftParenthesisExpected):(this.restoreAtMark(e),null)},t.prototype._parseMixinReference=function(){if(!this.peek(i.TokenType.Delim,"."))return null;var e=this.create(s.MixinReference),t=this.create(s.Identifier);if(this.consumeToken(),this.hasWhitespace()||!this.accept(i.TokenType.Ident))return this.finish(e,a.ParseError.IdentifierExpected);if(e.setIdentifier(this.finish(t)),!this.hasWhitespace()&&this.accept(i.TokenType.ParenthesisL)){if(e.getArguments().addChild(this._parseFunctionArgument()))for(;this.accept(i.TokenType.Comma)||this.accept(i.TokenType.SemiColon);)if(!e.getArguments().addChild(this._parseExpr()))return this.finish(e,a.ParseError.ExpressionExpected);if(!this.accept(i.TokenType.ParenthesisR))return this.finish(e,a.ParseError.RightParenthesisExpected);t.referenceTypes=[s.ReferenceType.Mixin]}else t.referenceTypes=[s.ReferenceType.Mixin,s.ReferenceType.Rule];return e.addChild(this._parsePrio()),this.finish(e)},t.prototype._parseMixinParameter=function(){var e=this.create(s.FunctionParameter);if(this.peek(i.TokenType.AtKeyword,"@rest")){var t=this.create(s.Node);return this.consumeToken(),this.accept(r.Ellipsis)?(e.setIdentifier(this.finish(t)),this.finish(e)):this.finish(e,a.ParseError.DotExpected,[],[i.TokenType.Comma,i.TokenType.ParenthesisR])}if(this.peek(r.Ellipsis)){var n=this.create(s.Node);return this.consumeToken(),e.setIdentifier(this.finish(n)),this.finish(e)}return e.setIdentifier(this._parseVariable())&&this.accept(i.TokenType.Colon),e.setDefaultValue(this._parseExpr(!0)),this.finish(e)},t.prototype._parseGuard=function(){var e=this.create(s.LessGuard);if(!this.accept(i.TokenType.Ident,"when"))return null;if(e.isNegated=this.accept(i.TokenType.Ident,"not"),!e.getConditions().addChild(this._parseGuardCondition()))return this.finish(e,a.ParseError.ConditionExpected);for(;this.accept(i.TokenType.Ident,"and")||this.accept(i.TokenType.Comma,",");)if(!e.getConditions().addChild(this._parseGuardCondition()))return this.finish(e,a.ParseError.ConditionExpected);return this.finish(e)},t.prototype._parseGuardCondition=function(){var e=this.create(s.GuardCondition);return this.accept(i.TokenType.ParenthesisL)?(!e.addChild(this._parseExpr()),this.accept(i.TokenType.ParenthesisR)?this.finish(e):this.finish(e,a.ParseError.RightParenthesisExpected)):null},t.prototype._parseFunctionIdentifier=function(){if(this.peek(i.TokenType.Delim,"%")){var t=this.create(s.Identifier);return t.referenceTypes=[s.ReferenceType.Function],this.consumeToken(),this.finish(t)}return e.prototype._parseFunctionIdentifier.call(this)},t}(n.Parser);t.LessParser=o}),define("vs/nls!vs/languages/less/common/services/intelliSense",["vs/nls","vs/nls!vs/languages/less/common/lessWorker"],function(e,t){return e.create("vs/languages/less/common/services/intelliSense",t)});var __extends=this&&this.__extends||function(e,t){function r(){this.constructor=e}for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i]);e.prototype=null===t?Object.create(t):(r.prototype=t.prototype,new r)};define("vs/languages/less/common/services/intelliSense",["require","exports","vs/languages/css/common/services/intelliSense","vs/nls!vs/languages/less/common/services/intelliSense"],function(e,t,r,i){var n=function(e){function t(){e.call(this,"@")}return __extends(t,e),t.prototype.createFunctionProposals=function(e,t){return e.forEach(function(e){t.push({label:e.name,typeLabel:e.example,documentationLabel:e.description,codeSnippet:e.name+"({{}})",type:"function"})}),t},t.prototype.getTermProposals=function(r){return this.createFunctionProposals(t.builtInProposals,r),e.prototype.getTermProposals.call(this,r)},t.prototype.getColorProposals=function(r,i){return this.createFunctionProposals(t.colorProposals,i),e.prototype.getColorProposals.call(this,r,i)},t.builtInProposals=[{name:"escape",example:"escape(@string);",description:i.localize(0,null)},{name:"e",example:"e(@string);",description:i.localize(1,null)},{name:"replace",example:"replace(@string, @pattern, @replacement[, @flags]);",description:i.localize(2,null)},{name:"unit",example:"unit(@dimension, [@unit: '']);",description:i.localize(3,null)},{name:"color",example:"color(@string);",description:i.localize(4,null)},{name:"convert",example:"convert(@value, unit);",description:i.localize(5,null)},{name:"data-uri",example:"data-uri([mimetype,] url);",description:i.localize(6,null)},{name:"length",example:"length(@list);",description:i.localize(7,null)},{name:"extract",example:"extract(@list, index);",description:i.localize(8,null)},{name:"abs",description:i.localize(9,null),example:"abs(number);"},{name:"acos",description:i.localize(10,null),example:"acos(number);"},{name:"asin",description:i.localize(11,null),example:"asin(number);"},{name:"ceil",example:"ceil(@number);",description:i.localize(12,null)},{name:"cos",description:i.localize(13,null),example:"cos(number);"},{name:"floor",description:i.localize(14,null),example:"floor(@number);"},{name:"percentage",description:i.localize(15,null),example:"percentage(@number);"},{name:"round",description:i.localize(16,null),example:"round(number, [places: 0]);"},{name:"sqrt",description:i.localize(17,null),example:"sqrt(number);"},{name:"sin",description:i.localize(18,null),example:"sin(number);"},{name:"tan",description:i.localize(19,null),example:"tan(number);"},{name:"atan",description:i.localize(20,null),example:"atan(number);"},{name:"pi",description:i.localize(21,null),example:"pi();"},{name:"pow",description:i.localize(22,null),example:"pow(@base, @exponent);"},{name:"mod",description:i.localize(23,null),example:"mod(number, number);"},{name:"min",description:i.localize(24,null),example:"min(@x, @y);"},{name:"max",description:i.localize(25,null),example:"max(@x, @y);"}],t.colorProposals=[{name:"argb",example:"argb(@color);",description:i.localize(26,null)},{name:"hsl",example:"hsl(@hue, @saturation, @lightness);",description:i.localize(27,null)},{name:"hsla",example:"hsla(@hue, @saturation, @lightness, @alpha);",description:i.localize(28,null)},{name:"hsv",example:"hsv(@hue, @saturation, @value);",description:i.localize(29,null)},{name:"hsva",example:"hsva(@hue, @saturation, @value, @alpha);",description:i.localize(30,null)},{name:"hue",example:"hue(@color);",description:i.localize(31,null)},{name:"saturation",example:"saturation(@color);",description:i.localize(32,null)},{name:"lightness",example:"lightness(@color);",description:i.localize(33,null)},{name:"hsvhue",example:"hsvhue(@color);",description:i.localize(34,null)},{name:"hsvsaturation",example:"hsvsaturation(@color);",description:i.localize(35,null)},{name:"hsvvalue",example:"hsvvalue(@color);",description:i.localize(36,null)},{name:"red",example:"red(@color);",description:i.localize(37,null)},{name:"green",example:"green(@color);",description:i.localize(38,null)},{name:"blue",example:"blue(@color);",description:i.localize(39,null)},{name:"alpha",example:"alpha(@color);",description:i.localize(40,null)},{name:"luma",example:"luma(@color);",description:i.localize(41,null)},{name:"saturate",example:"saturate(@color, 10%);",description:i.localize(42,null)},{name:"desaturate",example:"desaturate(@color, 10%);",description:i.localize(43,null)},{name:"lighten",example:"lighten(@color, 10%);",description:i.localize(44,null)},{name:"darken",example:"darken(@color, 10%);",description:i.localize(45,null)},{name:"fadein",example:"fadein(@color, 10%);",description:i.localize(46,null)},{name:"fadeout",example:"fadeout(@color, 10%);",description:i.localize(47,null)},{name:"fade",example:"fade(@color, 50%);",description:i.localize(48,null)},{name:"spin",example:"spin(@color, 10);",description:i.localize(49,null)},{name:"mix",example:"mix(@color1, @color2, [@weight: 50%]);",description:i.localize(50,null)},{name:"greyscale",example:"greyscale(@color);",description:i.localize(51,null)},{name:"contrast",example:"contrast(@color1, [@darkcolor: black], [@lightcolor: white], [@threshold: 43%]);",description:i.localize(52,null)},{name:"multiply",example:"multiply(@color1, @color2);"},{name:"screen",example:"screen(@color1, @color2);"},{name:"overlay",example:"overlay(@color1, @color2);"},{name:"softlight",example:"softlight(@color1, @color2);"},{name:"hardlight",example:"hardlight(@color1, @color2);"},{name:"difference",example:"difference(@color1, @color2);"},{name:"exclusion",example:"exclusion(@color1, @color2);"},{name:"average",example:"average(@color1, @color2);"},{name:"negation",example:"negation(@color1, @color2);"}],t}(r.CSSIntellisense);t.LESSIntellisense=n});var __extends=this&&this.__extends||function(e,t){function r(){this.constructor=e}for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i]);e.prototype=null===t?Object.create(t):(r.prototype=t.prototype,new r)};define("vs/languages/less/common/lessWorker",["require","exports","vs/languages/css/common/cssWorker","./parser/lessParser","./services/intelliSense"],function(e,t,r,i,n){var s=function(e){function t(){e.apply(this,arguments)}return __extends(t,e),t.prototype.createIntellisense=function(){return new n.LESSIntellisense},t.prototype.createParser=function(){return new i.LessParser},t}(r.CSSWorker);t.LessWorker=s});