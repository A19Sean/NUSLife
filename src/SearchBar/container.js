import React, { Component } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import SearchBarComponent from "./component";

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
        this.props.updateError(""); // Clears error field
        this.props.updateResult(response.data);
        this.props.updateHistory(mod);
      })
      .catch(error => {
        console.log(error);
        this.props.updateError("Could not find module");
      });
  };

  handleSubmit = event => {
    event.preventDefault();
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
      <SearchBarComponent
        autocomplete={this.state.autocomplete}
        error={this.props.error}
        handleClick={this.handleClick}
        handleChange={this.handleChange}
        handleSubmit={this.handleSubmit}
        searchMods={this.searchMods}
        selectSem={this.selectSem}
        selectYear={this.selectYear}
        value={this.state.value}
        year={this.state.year}
      />
    );
  }
}

SearchBar.propTypes = {
  addMod: PropTypes.func.isRequired,
  error: PropTypes.string,
  mod: PropTypes.string,
  updateResult: PropTypes.func.isRequired,
  updateHistory: PropTypes.func.isRequired,
  updateError: PropTypes.func.isRequired,
  year: PropTypes.string
};
