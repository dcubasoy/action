import PropTypes from 'prop-types';
import React, {Component} from 'react';
import getWordAt from 'universal/components/TaskEditor/getWordAt';
import resolvers from 'universal/components/TaskEditor/resolvers';
import AsyncMenuContainer from 'universal/modules/menu/containers/AsyncMenu/AsyncMenu';
import ui from 'universal/styles/ui';
import completeEntity, {autoCompleteEmoji} from 'universal/utils/draftjs/completeEnitity';
import getDraftCoords from 'universal/utils/getDraftCoords';
import getAnchorLocation from './getAnchorLocation';


const originAnchor = {
  vertical: 'top',
  horizontal: 'left'
};

const targetAnchor = {
  vertical: 'top',
  horizontal: 'left'
};

const fetchEditorSuggestions = () => System.import('universal/components/EditorSuggestions/EditorSuggestions');
const fetchSuggestMentionableUsers = () => System.import('universal/components/SuggestMentionableUsersRoot');

const withSuggestions = (ComposedComponent) => {
  class WithSuggestions extends Component {
    static propTypes = {
      handleUpArrow: PropTypes.func,
      handleDownArrow: PropTypes.func,
      editorRef: PropTypes.any,
      editorState: PropTypes.object.isRequired,
      handleTab: PropTypes.func,
      handleReturn: PropTypes.func,
      handleChange: PropTypes.func,
      setEditorState: PropTypes.func.isRequired,
      teamId: PropTypes.string.isRequired
    };

    state = {};

    setSuggestions = (suggestions) => {
      if (suggestions.length === 0) {
        this.removeModal();
      } else {
        this.setState({
          suggestions
        });
      }
    };

    handleUpArrow = (e) => {
      const {handleUpArrow} = this.props;
      if (handleUpArrow) {
        handleUpArrow(e);
      }
      e.preventDefault();
      const {active} = this.state;
      this.setState({
        active: Math.max(active - 1, 0)
      });
    };

    handleDownArrow = (e) => {
      const {handleDownArrow} = this.props;
      if (handleDownArrow) {
        handleDownArrow(e);
      }
      e.preventDefault();
      const {active, suggestions} = this.state;
      this.setState({
        active: Math.min(active + 1, suggestions.length - 1)
      });
    };

    handleSelect = (idx) => (e) => {
      const {editorState, setEditorState} = this.props;
      const {suggestions, suggestionType} = this.state;
      e.preventDefault();
      const item = suggestions[idx];
      if (suggestionType === 'tag') {
        const {name} = item;
        setEditorState(completeEntity(editorState, 'TAG', {value: name}, `#${name}`));
      } else if (suggestionType === 'emoji') {
        const unicode = item.emoji;
        setEditorState(autoCompleteEmoji(editorState, unicode));
      } else if (suggestionType === 'mention') {
        // team is derived from the task itself, so userId is the real useful thing here
        const [userId] = item.id.split('::');
        setEditorState(completeEntity(editorState, 'MENTION', {userId}, item.preferredName));
      }
      this.removeModal();
    };

    handleTab = (e) => {
      const {handleTab} = this.props;
      const {active} = this.state;
      if (handleTab) {
        handleTab(e);
      }
      this.handleSelect(active)(e);
    };

    handleReturn = (e) => {
      const {handleReturn} = this.props;
      const {active} = this.state;
      if (handleReturn) {
        handleReturn(e);
      }
      this.handleSelect(active)(e);
      return 'handled';
    };

    removeModal = () => {
      this.setState({
        active: undefined,
        suggestions: undefined,
        suggestionType: undefined
      });
    };

    checkForSuggestions = (word) => {
      const trigger = word[0];
      const triggerWord = word.slice(1);
      if (trigger === ':') {
        this.makeSuggestions(triggerWord, 'emoji');
        return true;
      } else if (trigger === '#') {
        this.makeSuggestions(triggerWord, 'tag');
        return true;
      } else if (trigger === '@') {
        this.setState({
          active: 0,
          triggerWord,
          suggestions: null,
          suggestionType: 'mention'
        });
        return true;
      }
      return false;
    };

    resolver = (resolveType) => {
      return resolvers[resolveType];
    };

    makeSuggestions = async (triggerWord, resolveType) => {
      // setState before promise so we can add a spinner to the component
      // this.setState({
      //  suggestionType: resolveType,
      // });
      const resolve = this.resolver(resolveType);
      const suggestions = await resolve(triggerWord);
      if (suggestions.length > 0) {
        this.setState({
          active: 0,
          suggestions,
          suggestionType: resolveType
        });
      } else {
        this.removeModal();
      }
    };

    handleChange = (editorState) => {
      const {handleChange} = this.props;
      if (handleChange) {
        handleChange(editorState);
      }
      const {block, anchorOffset} = getAnchorLocation(editorState);
      const blockText = block.getText();
      const entityKey = block.getEntityAt(anchorOffset - 1);
      const {word} = getWordAt(blockText, anchorOffset - 1);

      const inASuggestion = word && !entityKey && this.checkForSuggestions(word);
      const {suggestionType} = this.state;
      if (!inASuggestion && suggestionType) {
        this.removeModal();
      }
    }

    initialize = () => {
      const {suggestionType} = this.state;
      if (suggestionType) {
        const {renderModal, removeModal, handleUpArrow, handleDownArrow, handleTab, handleReturn} = this;
        return {renderModal, removeModal, handleUpArrow, handleDownArrow, handleTab, handleReturn};
      }
      return {};
    }

    renderModal = () => {
      const {active, triggerWord, suggestions, suggestionType} = this.state;
      const {editorRef, editorState, setEditorState, teamId} = this.props;
      const coords = getDraftCoords(editorRef);
      if (!coords) {
        setTimeout(() => {
          this.forceUpdate();
        });
      }
      if (suggestionType === 'mention') {
        return (
          <AsyncMenuContainer
            marginFromOrigin={ui.draftModalMargin}
            fetchMenu={fetchSuggestMentionableUsers}
            maxWidth={500}
            maxHeight={200}
            originAnchor={originAnchor}
            originCoords={coords}
            queryVars={{
              activeIdx: active,
              handleSelect: this.handleSelect,
              setSuggestions: this.setSuggestions,
              suggestions,
              triggerWord,
              teamId
            }}
            targetAnchor={targetAnchor}
            isOpen
          />
        );
      }
      return (
        <AsyncMenuContainer
          marginFromOrigin={ui.draftModalMargin}
          fetchMenu={fetchEditorSuggestions}
          maxWidth={500}
          maxHeight={200}
          originAnchor={originAnchor}
          originCoords={coords}
          queryVars={{
            editorState,
            setEditorState,
            active,
            suggestions,
            suggestionType,
            handleSelect: this.handleSelect,
            removeModal: this.removeModal
          }}
          targetAnchor={targetAnchor}
          isOpen
        />
      );
    };

    render() {
      const modalProps = this.initialize();
      return (<ComposedComponent
        {...this.props}
        {...modalProps}
        handleChange={this.handleChange}
      />);
    }
  }
  return WithSuggestions;
};

export default withSuggestions;
