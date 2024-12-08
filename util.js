// Returns a random number in the range [min, max].
export default function randRanged(min, max) {
    return Math.random() * (max - min) + min;
}