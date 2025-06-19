// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicVsExternal {
    uint256 public value;

    // Bad: Should be external (never called internally)
    function setValue(uint256 _value) public {
        value = _value;
    }

    // Bad: Should be external
    function getValue() public view returns (uint256) {
        return value;
    }
    
    // Bad: Complex function that should be external
    function complexCalculation(uint256 a, uint256 b) public pure returns (uint256) {
        uint256 result = a + b;
        result = result * 2;
        result = result / 3;
        return result;
    }
    
    // Good: Correctly external
    function externalFunction() external view returns (uint256) {
        return value * 2;
    }
    
    // Good: Public because called internally
    function publicHelper() public view returns (uint256) {
        return value + 10;
    }
    
    // Good: Calls publicHelper internally
    function usePublicHelper() external view returns (uint256) {
        return publicHelper() * 2;
    }
    
    // Bad: Should be external (calling with 'this' doesn't count)
    function callWithThis() public view returns (uint256) {
        return this.getValue();
    }
    
    // Constructor is fine as public
    constructor() {
        value = 100;
    }
}
