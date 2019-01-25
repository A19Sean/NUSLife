import React, { Component } from "react";
import PropTypes from "prop-types";

export default class SearchBarComponent extends Component {
  generateYears = n => {
    // Gets current year - 4
    const year = parseInt(new Date().toISOString().slice(0, 4)) - 4;
    return Array.from(new Array(n), (val, i) => year + i);
  };

  renderYears = () => (
    <React.Fragment>
      {this.generateYears(10).map(year => (
        <option key={year}>{year + "-" + (year + 1)}</option>
      ))}
    </React.Fragment>
  );

  render() {
    return (
      <form onSubmit={this.props.handleSubmit}>
        Module Code:
        <input
          type="text"
          name="name"
          value={this.props.value}
          onChange={this.props.handleChange}
          placeholder={"Search modules"}
        />
        <input type="submit" value="Search" />
        <button type="button" id="add-mod" onClick={this.props.handleClick}>
          Add Module
        </button>
        <br />
        Semester:
        <select id="select-sem" onClick={this.props.selectSem}>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
        Year:
        <select id="select-year" onClick={this.props.selectYear}>
          {this.renderYears()}
        </select>
        <br />
        <br />
        <span style={{ color: "red" }}>{this.props.error}</span>
        {this.props.autocomplete.map(module => (
          <p
            key={module}
            onClick={() => this.props.searchMods(this.props.year, module)}
          >
            {module}
          </p>
        ))}
      </form>
    );
  }
}

SearchBarComponent.propTypes = {
  autocomplete: PropTypes.array.isRequired,
  error: PropTypes.string,
  handleClick: PropTypes.func.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  searchMods: PropTypes.func.isRequired,
  selectSem: PropTypes.func.isRequired,
  selectYear: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  year: PropTypes.string
};
