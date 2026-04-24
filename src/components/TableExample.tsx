import React, { useState } from "react";

function EditableCell({ value: initialValue }) {
  const [value, setValue] = useState(initialValue);

  const handleClick = () => {
    const newValue = window.prompt("Yeni değeri girin:", value);
    if (newValue !== null) setValue(newValue);
  };

  return (
    <td
      style={{
        cursor: "pointer",
        userSelect: "none"
      }}
      onClick={handleClick}
    >
      {value}
    </td>
  );
}

function TableExample() {
  return (
    <table>
      <tbody>
        <tr>
          <EditableCell value="Hücre 1" />
          <EditableCell value="Hücre 2" />
        </tr>
      </tbody>
    </table>
  );
}

export default TableExample;
