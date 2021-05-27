/**
 * 标识React的工作标签
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type WorkTag =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18;

// 0 - 函数组件, 无状态组件
export const FunctionComponent = 0;
// 1 - 类组件, 有状态组件
export const ClassComponent = 1;
// 2 - 未确定的组件, 无状态组件
export const IndeterminateComponent = 2; // Before we know whether it is function or class
// 3 - ReactDOM.render的渲染起点, 原生组件
export const HostRoot = 3; // Root of a host tree. Could be nested inside another node.
// 4 - createPortal渲染的渲染起点, 原生组件
export const HostPortal = 4; // A subtree. Could be an entry point to a different renderer.
// 5 - 元素节点, 原生组件
export const HostComponent = 5;
// 6 - 纯文本节点, 原生组件
export const HostText = 6;
// 7 - Fragment节点, 虚拟组件
export const Fragment = 7;
// 8 - 16以上默认Concurrent Mode, 虚拟节点
export const Mode = 8;
// 9 - 上下文的消费者, 有状态组件
export const ContextConsumer = 9;
// 10 - 上下文的生产者, 有状态组件
export const ContextProvider = 10;
// 11 - 由React.forwardRef创建, 无状态组件
export const ForwardRef = 11;
// 12 - 用于性能检测, 虚拟节点
export const Profiler = 12;
// 13 - Suspense, 懒加载组件
export const SuspenseComponent = 13;
// 14 - React.memo创建, 无状态组件, TODO: T: 也可以用useMemo创建?
export const MemoComponent = 14;
// 15 - 如果没有指定React.memo的自定义比较方法则会fallback到SimpleMemoComponent, 无状态组件
export const SimpleMemoComponent = 15;
// 16 - 返回的是Promise, 懒加载组件
export const LazyComponent = 16;
// 17 - 不完整的classComponent, 在reconcile报错时生成
export const IncompleteClassComponent = 17;
// 18 - 脱水的Suspense组件, 应该在SSR时采用到 TODO: T:
export const DehydratedSuspenseComponent = 18;
