import React, { Component } from "react";
import PropTypes from "prop-types";
const axios = require("axios");

export default class SearchBar extends Component {
  constructor() {
    super();
    this.state = {
      value: "",
      sem: "1",
      year: "2018-2019",
      modules: [], // stores all modules
      autocomplete: [],
      selectedMod: "" // stored as module code
    };
  }

  searchMods = (year, mod) => {
    const url = `https://api.nusmods.com/${year}/modules/${mod}.json`;
    console.log(url);
    axios
      .get(url)
      .then(response => {
        this.setState(state => ({
          value: mod,
          year: year,
          autocomplete: [],
          selectedMod: response.data.ModuleCode  
        }));
        this.props.updateError(""); // make any existing error message disappear
        this.props.updateResult(response.data);
        this.props.updateHistory(mod);
      })
      .catch(error => {
        // handle error
        console.log(error);
        this.props.updateError("Could not find module");
        // this.props.updateResult(undefined);
      });
  };

  handleSubmit = event => {
    event.preventDefault();
    // who does the search? search button
    this.searchMods(this.state.year, this.state.value);
  };

  handleChange = event => {
    const value = event.target.value.toUpperCase();
    const modcodes = this.state.modules.map(mod => mod["ModuleCode"]);
    const results =
      value === ""
        ? []
        : modcodes.filter(mod => RegExp(value + "+").test(mod)).slice(0, 10);
    this.setState({
      value: value,
      autocomplete: results
    });
  };

  handleClick = () => {
    if (this.state.selectedMod == null) {
      this.props.updateError("No mod selected");
      return undefined;
    }
    const year = this.state.year;
    const sem = "Sem " + this.state.sem;
    const mod = this.state.selectedMod;

    this.props.addMod(mod, sem, year);
  };

  selectSem = event => {
    this.setState({ sem: event.target.value });
  };

  selectYear = event => {
    this.setState({ year: event.target.value });
    axios
      .get(`https://api.nusmods.com/${event.target.value}/moduleList.json`)
      .then(response => {
        this.setState({
          modules: response.data
        });
      });
  };

  generateYears = n => {
    return Array.from(new Array(n), (val, i) => 2000 + i);
  };

  renderYears = () => (
    <React.Fragment>
      {this.generateYears(20).map(year => (
        <option key={year}>{year + "-" + (year + 1)}</option>
      ))}
    </React.Fragment>
  );

  componentDidMount = () => {
    axios
      .get(`https://api.nusmods.com/${this.state.year}/moduleList.json`)
      .then(response => {
        this.setState({
          modules: response.data
        });
      });
  };

  componentDidUpdate = prevProps => {
    if (prevProps.mod !== this.props.mod) {
      this.searchMods(this.state.year, this.props.mod);
    }
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        Module Code:
        <input
          type="text"
          name="name"
          value={this.state.value}
          onChange={this.handleChange}
          placeholder={"Search modules"}
        />
        <input type="submit" value="Search" />
        <button type="button" id="add-mod" onClick={this.handleClick}>
          Add Module
        </button>
        <br />
        {this.state.selectedMod !== undefined ? (
          <button id="build-tree" onClick={() => this.props.buildPreReqTree(this.state.year)}>
            Build Tree
          </button>
        ) : (
          ""
        )}
        <br />
        Semester:
        <select id="select-sem" onClick={this.selectSem}>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
        Year:
        <select id="select-year" onClick={this.selectYear}>
          {this.renderYears()}
        </select>
        <br />
        <span style={{ color: "red" }}>{this.props.error}</span>
        {this.state.autocomplete.map(module => (
          <p
            key={module}
            onClick={() => this.searchMods(this.state.year, module)}
          >
            {module}
          </p>
        ))}
      </form>
    );
  }
}

SearchBar.propTypes = {
  addMod: PropTypes.func.isRequired,
  buildPreReqTree: PropTypes.func.isRequired,
  updateResult: PropTypes.func.isRequired,
  updateHistory: PropTypes.func.isRequired,
  updateError: PropTypes.func.isRequired,
  year: PropTypes.string,
  mod: PropTypes.string,
  error: PropTypes.string
};
