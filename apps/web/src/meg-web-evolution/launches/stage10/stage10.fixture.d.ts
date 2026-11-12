export type Stage10DemoEntry={
 id:string;description:string;type:'expense'|'income';categoryId:string;
 accountId:string;paymentMethodId:string;date:string;amount:string;status:string;
};
export type Stage10DemoOption={
 id:string;name:string;type:string;isActive:boolean;group?:string;
};
export type Stage10Fixture={
 meta:{mode:string;month:string;sources:string[]};
 accounts:Stage10DemoOption[];
 categories:Stage10DemoOption[];
 paymentMethods:Stage10DemoOption[];
 cards:{id:string;name:string;closingDay:number;dueDay:number;isActive:boolean}[];
 transactions:Stage10DemoEntry[];
};
export const stage10Fixture: Stage10Fixture;
