/// <reference types="nativewind/types" />

// Metro trasforma il CSS in un modulo con effetti collaterali: a TypeScript
// serve solo sapere che il file esiste.
declare module '*.css' {}
