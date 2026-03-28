; Function definitions
(call head: (symbol) @_type
  .
  (symbol) @name
  (#any-of? @_type "defn" "defn-" "defmacro" "defmulti" "defmethod")) @definition.function

(begin_end_call head: (symbol) @_type
  .
  (symbol) @name
  (#any-of? @_type "defn" "defn-" "defmacro" "defmulti" "defmethod")) @definition.function

; Variable definitions
(call head: (symbol) @_type
  .
  (symbol) @name
  (#any-of? @_type "def" "defonce")) @definition.variable

; Type definitions
(call head: (symbol) @_type
  .
  (symbol) @name
  (#any-of? @_type "defprotocol" "defrecord" "deftype" "definterface")) @definition.type
