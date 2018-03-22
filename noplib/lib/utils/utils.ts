

export function randInt(min: number, max: number): number {
    let n = max - min;
    return min + Math.floor(Math.random() * n);
}

export function randArray<T>(obj: T[]): T {
    let n = obj.length;
    return obj[Math.floor(Math.random() * n)];
}

